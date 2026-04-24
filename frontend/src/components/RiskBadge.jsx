export default function RiskBadge({ score }) {
  let label = "Low";
  let cls = "bg-emerald-100 text-emerald-700";

  if (score >= 30 && score <= 70) {
    label = "Medium";
    cls = "bg-amber-100 text-amber-700";
  }
  if (score > 70) {
    label = "High";
    cls = "bg-red-100 text-red-700";
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {label} Risk ({score})
    </span>
  );
}
