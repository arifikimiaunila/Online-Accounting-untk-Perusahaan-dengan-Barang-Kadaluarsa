import { downloadReport } from "../api/client";

export default function ExportButtons({
  path,
  params,
  filenameBase,
}: {
  path: string;
  params: Record<string, unknown>;
  filenameBase: string;
}) {
  const download = async (format: "csv" | "pdf") => {
    await downloadReport(path, { ...params, format }, `${filenameBase}.${format}`);
  };

  return (
    <div className="flex gap-2">
      <button className="btn-secondary" onClick={() => download("csv")}>
        ⬇ CSV
      </button>
      <button className="btn-secondary" onClick={() => download("pdf")}>
        ⬇ PDF
      </button>
    </div>
  );
}
