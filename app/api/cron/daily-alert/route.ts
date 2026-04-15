//app/ api/ cron/ daily-alert/ route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays, differenceInHours } from "date-fns";
import { resend, EMAIL_FROM } from "@/lib/mail/resend";
import { sendPushNotification } from "@/lib/push";

// Email Configuration Check - Since we use resend, we just need the API KEY checked in the util
const isEmailConfigured = true;

export async function GET(req: Request) {
    // Verify Cron Secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting Daily Expiration Check...");

        // 1. Fetch Users with Alerts Enabled
        const usersWithAlerts = await prisma.userPreferences.findMany({
            where: { enableExpirationAlert: true },
            select: {
                userId: true,
                alertDaysBefore: true,
                user: { select: { email: true, name: true } },
            },
        });

        const updates: any[] = [];
        const emailsSent: string[] = [];
        const pushSent: string[] = [];
        const pushFailed: string[] = [];

        for (const pref of usersWithAlerts) {
            const userId = pref.userId;
            const thresholdDays = pref.alertDaysBefore || 3;
            const userEmail = pref.user.email;

            // Get ingredients for this user
            const ingredients = await prisma.ingredient.findMany({
                where: { userId },
            });

            // Filter expiring items
            const expiringItems = ingredients.filter((i) => {
                if (!i.expirationDate) return false;
                const days = differenceInDays(i.expirationDate, new Date());
                return days >= 0 && days <= thresholdDays;
            });

            if (expiringItems.length > 0) {
                const itemsToNotify: typeof expiringItems = [];

                // 2. Process Alerts & Rate Limiting
                for (const item of expiringItems) {
                    // Check existing alert to avoid spam (e.g. if run twice a day)
                    const existingAlert = await prisma.inventoryAlert.findUnique({
                        where: {
                            userId_ingredientId_alertType: {
                                userId,
                                ingredientId: item.id,
                                alertType: "expiration",
                            },
                        },
                    });

                    // Skip if alerted within last 23 hours
                    if (existingAlert?.lastAlertedAt) {
                        const hoursSince = differenceInHours(
                            new Date(),
                            existingAlert.lastAlertedAt,
                        );
                        if (hoursSince < 23) {
                            continue;
                        }
                    }

                    // Add to notification list
                    itemsToNotify.push(item);

                    // Update/Create Alert Record
                    await prisma.inventoryAlert.upsert({
                        where: {
                            userId_ingredientId_alertType: {
                                userId,
                                ingredientId: item.id,
                                alertType: "expiration",
                            },
                        },
                        create: {
                            userId,
                            ingredientId: item.id,
                            alertType: "expiration",
                            alertDays: thresholdDays,
                            lastAlertedAt: new Date(),
                        },
                        update: {
                            lastAlertedAt: new Date(),
                        },
                    });
                }

                if (itemsToNotify.length > 0) {
                    updates.push({ userId, count: itemsToNotify.length });

                    // 3. Send Email Notification
                    if (userEmail && isEmailConfigured) {
                        const itemsList = itemsToNotify
                            .map(
                                (i) =>
                                    `- ${i.name} (あと${differenceInDays(i.expirationDate ?? new Date(), new Date())}日)`,
                            )
                            .join("\n");

                        try {
                            const { error: sendError } = await resend.emails.send({
                                from: EMAIL_FROM,
                                to: userEmail,
                                subject: `【My-fridgeai】賞味期限が近い食材があります(${itemsToNotify.length}件)`,
                                text:
                                    `${pref.user.name ?? "ユーザー"} 様\n\n` +
                                    `以下の食材の賞味期限が近づいています。\n\n` +
                                    `${itemsList} \n\n` +
                                    `これらの食材を使って献立を作成しませんか？\n` +
                                    `${process.env.NEXTAUTH_URL} /menu/generate`,
                            });

                            if (sendError) {
                                console.error(`Failed to send email to ${userEmail} via Resend`, sendError);
                            } else {
                                emailsSent.push(userEmail);
                            }
                        } catch (emailErr) {
                            console.error(`Failed to send email to ${userEmail} `, emailErr);
                        }
                    } else if (!isEmailConfigured) {
                        console.log("Email not configured, skipping email notification");
                    }

                    // 4. Send Web Push Notification
                    try {
                        const pushSubs = await prisma.pushSubscription.findMany({
                            where: { userId, isActive: true },
                        });

                        if (pushSubs.length > 0) {
                            const itemsText = itemsToNotify
                                .map((i) => `${i.name}(あと${differenceInDays(i.expirationDate ?? new Date(), new Date())}日)`)
                                .join('、');

                            const pushPayload = {
                                title: `賞味期限アラート(${itemsToNotify.length}件)`,
                                body: itemsText,
                                tag: `expiration-${userId}`,
                                url: '/home',
                            };

                            for (const sub of pushSubs) {
                                try {
                                    await sendPushNotification(
                                        {
                                            endpoint: sub.endpoint,
                                            keys: {
                                                p256dh: sub.p256dh,
                                                auth: sub.auth,
                                            },
                                        },
                                        pushPayload
                                    );
                                    pushSent.push(sub.endpoint.slice(-20));
                                } catch (pushErr: any) {
                                    console.error(`Push failed for ${userId}:`, pushErr.message);
                                    pushFailed.push(sub.endpoint.slice(-20));
                                    // 無効な購読を無効化
                                    if (pushErr.message?.includes('Subscription expired') || pushErr.message?.includes('invalid')) {
                                        await prisma.pushSubscription.update({
                                            where: { id: sub.id },
                                            data: { isActive: false },
                                        });
                                    }
                                }
                            }
                        }
                    } catch (pushErr) {
                        console.error(`Push notification error for ${userId}:`, pushErr);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            processedUsers: usersWithAlerts.length,
            alertsCreated: updates.length,
            emailsSent: emailsSent.length,
            pushSent: pushSent.length,
            pushFailed: pushFailed.length,
        });
    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
