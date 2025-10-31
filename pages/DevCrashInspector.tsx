import React from "react";
import { getLastCrash, clearLastCrash } from "../libs/logging/crashLogger";

export default function DevCrashInspector() {
  const [report, setReport] = React.useState(getLastCrash());
  const refresh = () => setReport(getLastCrash());

  if (!report) return (
    <div className="p-4 font-sans">
      <h2 className="text-xl font-bold">No crash captured</h2>
      <p className="my-2">No crash has been logged in this session yet.</p>
      <button className="border px-3 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={refresh}>Refresh</button>
    </div>
  );

  const { message, name, at, stack, culprit, context } = report;
  return (
    <div className="p-4 space-y-4 font-sans bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Last Crash Report</h2>
        <div className="text-sm text-gray-500">{new Date(at).toLocaleString()}</div>
      </div>
      <div className="bg-red-100 border border-red-300 p-4 rounded-lg">
        <div className="font-mono text-red-900 font-semibold">{name}: {message}</div>
        {culprit.frame && (
          <div className="mt-2 font-mono text-sm text-red-800">
            <strong>Culprit:</strong> {culprit.frame.functionName || "(anonymous)"} — {culprit.frame.fileName}:{culprit.frame.lineNumber}:{culprit.frame.columnNumber}
          </div>
        )}
      </div>

      <details open className="bg-white p-3 border rounded-lg">
        <summary className="font-semibold cursor-pointer">Stack Trace</summary>
        <pre className="mt-2 overflow-auto text-xs bg-gray-50 p-2 border rounded">{stack.map(f => `${f.raw || `${f.functionName || "(fn)"} @ ${f.fileName}:${f.lineNumber}:${f.columnNumber}`}`).join("\n")}</pre>
      </details>

      <details className="bg-white p-3 border rounded-lg">
        <summary className="font-semibold cursor-pointer">Context</summary>
        <pre className="mt-2 overflow-auto text-xs bg-gray-50 p-2 border rounded">{JSON.stringify(context, null, 2)}</pre>
      </details>

      <div className="flex gap-2 pt-4 border-t">
        <button className="border px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600" onClick={() => { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); alert('Copied!'); }}>Copy JSON</button>
        <button className="border px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" onClick={() => { clearLastCrash(); refresh(); }}>Clear Report</button>
      </div>
    </div>
  );
}
