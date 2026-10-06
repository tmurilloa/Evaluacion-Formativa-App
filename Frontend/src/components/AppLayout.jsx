export default function AppLayout({ title, roleLabel, userName, nav = [], onSignOut, children }) {
    const inicial = (userName || '?').trim().charAt(0).toUpperCase()

    return (
    <div className="app-shell">
        <aside className="app-sidebar">
        <div className="sidebar-brand">
            <i className="bi bi-mortarboard-fill" style={{ fontSize: '1.8rem' }}></i>
            <span>Evaluación<br />Formativa</span>
        </div>

        <nav className="sidebar-nav">
            {nav.map(item => (
            <button
                key={item.label}
                className={item.active ? 'active' : ''}
                onClick={item.onClick}
            >
                <i className={`bi ${item.icon}`}></i>
                {item.label}
            </button>
            ))}
        </nav>

        <div className="sidebar-user">
            <div className="avatar">{inicial}</div>
            <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ opacity: 0.75 }}>{roleLabel}</div>
            </div>
        </div>
        </aside>

        <div className="app-main">
        <header className="app-topbar">
            <h1>{title}</h1>
            <div className="topbar-user">
            <span className="text-muted d-none d-sm-inline">Hola, {userName}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={onSignOut}>
                <i className="bi bi-box-arrow-right me-1"></i>Cerrar sesión
            </button>
            </div>
        </header>

        <main className="app-content">
            <div className="container-fluid">
            {children}
            </div>
        </main>
        </div>
    </div>
    )
}