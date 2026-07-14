import React from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { formatWPRToText } from '../../../../src/modules/operations/utils/wprFormatter';

export default function WPRDetailView({ wpr, onNavigate }) {
  const copyWhatsApp = () => {
    const text = formatWPRToText(wpr);
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getVarianceBadge = (variance) => {
    const v = parseFloat(variance) || 0;
    if (v < -5) return <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded text-xs font-semibold">Behind ({v}%)</span>;
    if (v > 5) return <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded text-xs font-bold">Ahead (+{v}%)</span>;
    return <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded text-xs font-semibold font-semibold">On Track ({v > 0 ? '+' : ''}{v}%)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <button onClick={() => onNavigate('history')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
        <Button variant="outline" onClick={copyWhatsApp} className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400">
          <MessageCircle className="w-4 h-4 mr-2" /> Share WPR via WhatsApp
        </Button>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Side-by-Side Images */}
          {(wpr.render_image_url || wpr.actual_image_url) && (
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-md font-semibold text-slate-200">Paired Media Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 3D Design Render */}
                  <div className="bg-slate-950 p-3 rounded border border-slate-800/80 space-y-2">
                    <span className="text-xs text-slate-400 block font-semibold">3D Design Render</span>
                    <div className="h-56 rounded overflow-hidden flex justify-center items-center bg-slate-900 border border-slate-800">
                      {wpr.render_image_url ? (
                        <img src={wpr.render_image_url} alt="3D Design Render" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-600">No 3D Render Image</span>
                      )}
                    </div>
                  </div>

                  {/* Actual Site Photo */}
                  <div className="bg-slate-950 p-3 rounded border border-slate-800/80 space-y-2">
                    <span className="text-xs text-slate-400 block font-semibold">Actual Site Photo</span>
                    <div className="h-56 rounded overflow-hidden flex justify-center items-center bg-slate-900 border border-slate-800">
                      {wpr.actual_image_url ? (
                        <img src={wpr.actual_image_url} alt="Site Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-600">No Site Photo</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Narrative */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-md font-semibold text-slate-200">Summary Narrative</h3>
              <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">
                {wpr.summary_text || "No summary text provided for this weekly report."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status Info */}
        <div className="space-y-6">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-md font-semibold text-slate-200 border-b border-slate-800 pb-2">WPR Meta</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Project</span>
                  <span className="text-slate-200 font-semibold">{wpr.project}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Target Week</span>
                  <span className="text-slate-300 font-medium text-xs">{wpr.week_start} to {wpr.week_end}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Generated By</span>
                  <span className="text-slate-300">{wpr.generated_by || "System"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Planned</span>
                    <span className="text-slate-200 font-bold">{wpr.planned_progress}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Actual</span>
                    <span className="text-slate-200 font-bold">{wpr.actual_progress}%</span>
                  </div>
                </div>
                <div className="border-t border-slate-800/60 pt-3">
                  <span className="text-xs text-slate-500 block mb-1">Status Variance</span>
                  <div>{getVarianceBadge(wpr.variance)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
