"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

export default function OverviewCards({ stats }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      <Card className="flex min-w-0 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 max-w-full items-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
          <span className="truncate whitespace-nowrap text-xs uppercase font-semibold sm:text-sm">Total Requests</span>
        </div>
        <span className="w-full truncate text-lg font-bold xl:text-xl" title={fmt(stats.totalRequests)}>{fmt(stats.totalRequests)}</span>
        <span className="text-[10px] invisible select-none">Placeholder</span>
      </Card>
      <Card className="flex min-w-0 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 max-w-full items-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[16px]">input</span>
          <span className="truncate whitespace-nowrap text-xs uppercase font-semibold sm:text-sm">Total Input Tokens</span>
        </div>
        <span className="w-full truncate text-lg font-bold text-primary xl:text-xl" title={fmt(stats.totalPromptTokens)}>{fmt(stats.totalPromptTokens)}</span>
        <span className="text-[10px] invisible select-none">Placeholder</span>
      </Card>
      <Card className="flex min-w-0 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 max-w-full items-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span className="truncate whitespace-nowrap text-xs uppercase font-semibold sm:text-sm">Cached Tokens</span>
        </div>
        <span className="w-full truncate text-lg font-bold text-info xl:text-xl" title={fmt(stats.totalCachedTokens)}>{fmt(stats.totalCachedTokens)}</span>
        <span className="text-[10px] invisible select-none">Placeholder</span>
      </Card>
      <Card className="flex min-w-0 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 max-w-full items-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[16px]">output</span>
          <span className="truncate whitespace-nowrap text-xs uppercase font-semibold sm:text-sm">Output Tokens</span>
        </div>
        <span className="w-full truncate text-lg font-bold text-success xl:text-xl" title={fmt(stats.totalCompletionTokens)}>{fmt(stats.totalCompletionTokens)}</span>
        <span className="text-[10px] invisible select-none">Placeholder</span>
      </Card>
      <Card className="flex min-w-0 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 max-w-full items-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[16px]">payments</span>
          <span className="truncate whitespace-nowrap text-xs uppercase font-semibold sm:text-sm">Est. Cost</span>
        </div>
        <span className="w-full truncate text-lg font-bold text-warning xl:text-xl" title={`~${fmtCost(stats.totalCost)}`}>~{fmtCost(stats.totalCost)}</span>
        <span className="w-full truncate whitespace-nowrap text-[10px] text-text-muted" title="Estimated, not actual billing">Estimated, not actual billing</span>
      </Card>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
