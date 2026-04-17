// app/menu/generate/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import ErrorBoundary from "@/app/components/error-boundary";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import MenuResultCard from "@/app/components/menu/MenuResultCard";
import MenuComparisonBar from "@/app/components/menu/MenuComparisonBar";
import MenuLightSuggestion from "@/app/components/menu/MenuLightSuggestion";
import { History, Calendar, CheckCircle, ArrowLeft, ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFridge } from "@/app/components/FridgeProvider";

// Custom Hook & Components
import { useMenuGeneration } from "@/app/hooks/useMenuGeneration";
import { MenuConditionsForm } from "@/app/components/menu/MenuConditionsForm";
import { GenerationStatus } from "@/app/components/menu/GenerationStatus";
import { RecipeModal } from "@/app/components/menu/RecipeModal";
import { calculateCookingTime, calculateDifficulty } from "@/app/menu/generate/utils";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { MenuSkeleton } from "@/app/components/menu/MenuSkeleton";
import { trackEvent, TelemetryAction } from "@/lib/telemetry";

function MenuGeneratePage() {
  const router = useRouter();
  const {
    isPro,
    inventoryCount,
    expiringCount,
    servings,
    setServings,
    budget,
    setBudget,
    enableBudget,
    setEnableBudget,
    strictMode,
    setStrictMode,
    loading,
    error,
    generated,
    ingredientsLoading,
    isStreaming,
    thoughtStream,
    currentThoughtIndex,
    selectedMenuType,
    selectedMenuData,
    loadingRecipe,
    recipeDetails,
    currentDishIndex,
    setCurrentDishIndex,
    errorRecipe,
    loadingCook,
    isNavBarVisible,
    shuffledMessages,
    handleGenerate,
    handleSelectMenu,
    handleConfirmCook,
    handleAddToShoppingList,
    closeRecipeModal,
  } = useMenuGeneration();

  const { setShopping } = useFridge();

  // ページ表示を記録
  useEffect(() => {
    trackEvent(TelemetryAction.VIEW_GENERATE_PAGE);
  }, []);

  // 献立結果が表示されたタイミングを記録
  useEffect(() => {
    if (generated) {
      trackEvent(TelemetryAction.VIEW_MENU_RESULT, {
        menuGenerationId: generated.id,
        inventoryCount,
      });
    }
  }, [generated, inventoryCount]);

  return (
    <ErrorBoundary>
      <PageTransition
        className="max-w-4xl mx-auto px-4 py-8 pb-32"
        aria-hidden={!isNavBarVisible}
      >
        <HeaderTransition className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              AI献立提案
            </h1>
            {!loading && (
              <button
                onClick={() => router.push("/history")}
                className="text-xs flex items-center gap-1 bg-[var(--surface-bg)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-full transition"
              >
                <History size={14} />
                履歴
              </button>
            )}
          </div>
          <div className="flex items-center" style={{ minHeight: "36px", minWidth: "120px", justifyContent: "flex-end" }}>
            {isPro === true && (
              <a
                href="/menu/weekly"
                className="text-sm font-medium flex items-center px-3 py-1.5 rounded-full transition whitespace-nowrap bg-[var(--accent-faded)] text-[var(--accent)] border border-[var(--surface-border)]"
              >
                <Calendar size={16} className="mr-1" />
                1週間分を作成する
              </a>
            )}
          </div>
        </HeaderTransition>

        <ContentTransition className="space-y-6">
          {!generated && !loading && (
            <div className="text-center mb-8 p-6 bg-[var(--surface-bg)] rounded-2xl border border-[var(--surface-border)]">
               <ChefHat size={48} className="mx-auto mb-3 text-[var(--accent)]" />
               <h2 className="text-xl font-bold text-[var(--color-text-primary)]">冷蔵庫の食材から献立を考えます</h2>
               <div className="text-sm text-[var(--color-text-secondary)] mt-2 flex flex-wrap justify-center items-baseline gap-x-1 min-h-[1.25rem]">
                 {ingredientsLoading ? (
                   <Skeleton className="h-4 w-64" />
                 ) : (
                   <>
                     <span>現在、在庫が</span>
                     <span className="font-bold text-[var(--color-text-primary)] whitespace-nowrap">{inventoryCount ?? "-"} 品</span>
                     <span>あります。</span>
                     {expiringCount ? (
                       <>
                         <span>そのうち</span>
                         <span className="font-bold text-amber-500 whitespace-nowrap">{expiringCount} 品</span>
                         <span>の賞味期限が迫っています。</span>
                       </>
                     ) : null}
                   </>
                 )}
               </div>
            </div>
          )}

          <MenuConditionsForm
            servings={servings}
            setServings={setServings}
            budget={budget.toString()}
            setBudget={(val) => setBudget(val === "" ? "" : parseInt(val))}
            enableBudget={enableBudget}
            setEnableBudget={setEnableBudget}
            strictMode={strictMode}
            setStrictMode={setStrictMode}
            loading={loading}
            generated={generated}
            onGenerate={handleGenerate}
            isPro={isPro ?? undefined}
          />

          <GenerationStatus
            loading={loading}
            isStreaming={isStreaming}
            generated={generated}
            thoughtStream={thoughtStream}
            currentThoughtIndex={currentThoughtIndex}
            shuffledMessages={shuffledMessages}
            error={error}
            onRetry={handleGenerate}
          />

          {loading && !generated && (
            <div className="mt-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-7 w-48" />
              </div>
              <MenuSkeleton />
            </div>
          )}

          {generated && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                  <CheckCircle size={20} className="text-green-500" />
                  おすすめの献立
                </h2>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("menuGeneratedResult");
                    window.location.reload(); // Simple reset
                  }}
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  別の条件で生成
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MenuResultCard
                  type="main"
                  menu={{
                    name: generated.menus?.main?.title ?? "献立",
                    description: generated.menus?.main?.reason ?? "",
                    cookingTime: calculateCookingTime(generated.menus?.main?.dishes ?? []),
                    difficulty: calculateDifficulty(generated.menus?.main?.dishes ?? []),
                    dishes: generated.menus?.main?.dishes ?? [],
                    role: generated.menus?.main?.role ?? "balanced",
                  }}
                  scores={generated.nutrition?.scores?.main || {}}
                  availability={generated.usedIngredients?.main}
                  generationId={generated.id}
                  onSelect={() => handleSelectMenu("main", generated.menus?.main)}
                  isBest={true}
                  isPro={isPro === true}
                  onAddToShoppingList={(items) => handleAddToShoppingList(items, setShopping)}
                />
                <MenuResultCard
                  type="alternative"
                  menu={{
                    name: generated.menus?.alternativeA?.title ?? "代替案",
                    description: generated.menus?.alternativeA?.reason ?? "",
                    cookingTime: calculateCookingTime(generated.menus?.alternativeA?.dishes ?? []),
                    difficulty: calculateDifficulty(generated.menus?.alternativeA?.dishes ?? []),
                    dishes: generated.menus?.alternativeA?.dishes ?? [],
                    role: generated.menus?.alternativeA?.role ?? "timeOptimized",
                  }}
                  scores={generated.nutrition?.scores?.altA || {}}
                  availability={generated.usedIngredients?.altA}
                  generationId={generated.id}
                  onSelect={() => handleSelectMenu("altA", generated.menus?.alternativeA)}
                  isPro={isPro === true}
                  onAddToShoppingList={(items) => handleAddToShoppingList(items, setShopping)}
                />
              </div>

              <MenuComparisonBar
                comparison={generated.nutrition?.comparison}
                mainRole={generated.menus?.main?.role}
                alternativeRole={generated.menus?.alternativeA?.role}
                isPro={isPro === true}
              />

              {generated.nutrition?.lightSuggestion && (
                <MenuLightSuggestion suggestion={generated.nutrition.lightSuggestion} />
              )}
            </div>
          )}
        </ContentTransition>
      </PageTransition>

      <RecipeModal
        isOpen={!!selectedMenuType}
        onClose={closeRecipeModal}
        selectedMenuType={selectedMenuType}
        selectedMenuData={selectedMenuData}
        loadingRecipe={loadingRecipe}
        recipeDetails={recipeDetails}
        currentDishIndex={currentDishIndex}
        setCurrentDishIndex={setCurrentDishIndex}
        errorRecipe={errorRecipe}
        handleSelectMenu={handleSelectMenu}
        handleConfirmCook={handleConfirmCook}
        loadingCook={loadingCook}
        strictMode={strictMode}
        servingsCount={servings}
        enableBudget={enableBudget}
        budget={budget.toString()}
      />
    </ErrorBoundary>
  );
}

export default function MenuGeneratePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <MenuGeneratePage />
    </Suspense>
  );
}
