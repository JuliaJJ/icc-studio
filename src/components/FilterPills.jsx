export default function FilterPills({ options, active, onChange }) {
  return (
    <div className="filter-pills">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`filter-pill ${active === opt.value ? 'filter-pill--active' : ''}`}
          onClick={() => {
            if (opt.value === 'all') {
              onChange('all')
            } else {
              onChange(active === opt.value ? 'all' : opt.value)
            }
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
