interface Props {
  data: Record<string, unknown>[]
  color?: 'green' | 'cyan'
  maxRows?: number
}

export default function DataTable({ data, color = 'green', maxRows = 25 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-600 text-xs font-mono p-8 text-center border border-gray-800 rounded-lg">
        NO RECORDS FOUND
      </div>
    )
  }

  const columns = Object.keys(data[0])
  const accentBorder = color === 'green' ? 'border-[#00ff41]/20' : 'border-[#00d4ff]/20'
  const accentText   = color === 'green' ? 'text-[#00ff41]/60'  : 'text-[#00d4ff]/60'
  const hoverBg      = color === 'green' ? 'hover:bg-[#00ff41]/5' : 'hover:bg-[#00d4ff]/5'
  const rows = data.slice(0, maxRows)

  return (
    <div className={`border ${accentBorder} rounded-lg bg-[#0d0d0d] overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className={`border-b ${accentBorder} ${accentText} tracking-widest`}>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left uppercase whitespace-nowrap font-normal">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[#111] ${hoverBg} transition-colors duration-100`}
              >
                {columns.map((col) => {
                  const cell = row[col]
                  const display =
                    cell === null || cell === undefined
                      ? '—'
                      : typeof cell === 'object'
                      ? JSON.stringify(cell)
                      : String(cell)
                  return (
                    <td key={col} className="px-4 py-3 text-gray-400 max-w-xs truncate" title={display}>
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > maxRows && (
        <div className={`px-4 py-2 text-gray-600 text-[10px] font-mono border-t border-[#111] ${accentText}`}>
          SHOWING {maxRows} OF {data.length} RECORDS
        </div>
      )}
    </div>
  )
}
