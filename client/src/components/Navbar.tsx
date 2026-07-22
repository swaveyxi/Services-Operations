import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { logoutToShell } from '@/auth/authBridge';
import { listPendingApprovals } from '@/services';
import { useUserTeams } from '@/hooks/useUserTeams';
import { MD_ROLE, SUPER_ADMIN_ROLE, OPERATIONS_ADMIN_ROLE, OPERATIONS_ROLE } from '@shared/constants';
import s from './Navbar.module.css';

const ERP_URL = import.meta.env.VITE_DRAGNET_ERP_URL;
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Navbar() {
  const { userName, userEmail, hasRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMd = hasRole(MD_ROLE);
  const isSuperAdmin = hasRole(SUPER_ADMIN_ROLE);
  // Same roles gate both the Operations workspace and Org Dashboard — both
  // read from /api/forms & friends, which require one of these server-side.
  const canViewOperations = hasRole(OPERATIONS_ROLE) || hasRole(OPERATIONS_ADMIN_ROLE) || isSuperAdmin;
  const teams = useUserTeams();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isMd) return;
    listPendingApprovals().then((c) => setPendingCount(c.length));
  }, [isMd]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${s.link} ${isActive ? s.linkActive : ''}`;

  return (
    <nav className={s.navbar}>
      <div className={s.inner}>
        <a href={`/`} className={s.brand}>
          <img src='/dragnet-logo.png' alt='Dragnet' className={s.brandLogo} />
          Service &amp; Operations
        </a>
        <div className={s.navDivider} aria-hidden='true' />

        <div className={s.links}>
          <a href={`${ERP_URL}/`} className={s.link}>
            <i className='fa-solid fa-house' aria-hidden='true' /> Dragnet ERP
          </a>
          <NavLink to='/' end className={linkClass}>
            <i className='fa-solid fa-folder-open' aria-hidden='true' /> My
            Cases
          </NavLink>

          {canViewOperations && (
            teams.length > 0 ? (
              <div className={s.dropdown}>
                <NavLink to='/operations' className={linkClass}>
                  <i className='fa-solid fa-clipboard-check' aria-hidden='true' />{' '}
                  Operations{' '}
                  <i
                    className='fa-solid fa-chevron-down'
                    aria-hidden='true'
                    style={{ fontSize: '0.65rem' }}
                  />
                </NavLink>
                <div className={s.dropdownMenu}>
                  {teams.map((t) => (
                    <NavLink
                      key={t.slug}
                      to={`/operations/${t.slug}`}
                      className={s.dropdownItem}
                    >
                      <i className={`fa-solid ${t.icon}`} aria-hidden='true' />{' '}
                      {t.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink to='/operations' className={linkClass}>
                <i className='fa-solid fa-clipboard-check' aria-hidden='true' />{' '}
                Operations
              </NavLink>
            )
          )}

          {canViewOperations && (
            <NavLink to='/org-dashboard' className={linkClass}>
              <i className='fa-solid fa-gauge-high' aria-hidden='true' /> Org
              Dashboard
            </NavLink>
          )}
          {isMd && (
            <NavLink to='/approvals' className={linkClass}>
              <i className='fa-solid fa-circle-check' aria-hidden='true' /> Approvals
              {pendingCount > 0 && (
                <span className={s.badge}>{pendingCount}</span>
              )}
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink to='/admin' className={linkClass}>
              <i className='fa-solid fa-screwdriver-wrench' aria-hidden='true' /> Admin
            </NavLink>
          )}
        </div>

        <div className={s.right} ref={menuRef}>
          <button
            className={s.userBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup='menu'
            aria-label={`Account menu for ${userName}`}
          >
            <span className={s.avatar}>{initials(userName) || 'U'}</span>
            <i
              className='fa-solid fa-chevron-down'
              aria-hidden='true'
              style={{ fontSize: '0.6rem', opacity: 0.7 }}
            />
          </button>
          <button
            className={s.hamburger}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label='Toggle navigation'
          >
            <i
              className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`}
              aria-hidden='true'
            />
          </button>
          {menuOpen && (
            <div className={s.menu} role='menu'>
              <div className={s.menuHead}>
                <div className={s.menuName}>{userName}</div>
                <div className={s.menuMail}>{userEmail}</div>
              </div>
              <button className={s.menuItem} onClick={logoutToShell}>
                <i
                  className='fa-solid fa-arrow-right-from-bracket'
                  aria-hidden='true'
                />{' '}
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className={s.mobileOpen}>
          <a
            href={`${ERP_URL}/`}
            className={s.link}
            onClick={() => setMobileOpen(false)}
          >
            <i className='fa-solid fa-house' aria-hidden='true' /> Work Desk
          </a>
          <NavLink
            to='/'
            end
            className={linkClass}
            onClick={() => setMobileOpen(false)}
          >
            <i className='fa-solid fa-folder-open' aria-hidden='true' /> My
            Cases
          </NavLink>
          {canViewOperations && (
            <NavLink
              to='/operations'
              end
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <i className='fa-solid fa-clipboard-check' aria-hidden='true' />{' '}
              Operations
            </NavLink>
          )}
          {canViewOperations && teams.map((t) => (
            <NavLink
              key={t.slug}
              to={`/operations/${t.slug}`}
              className={`${s.link} ${s.mobileChild}`}
              onClick={() => setMobileOpen(false)}
            >
              <i className={`fa-solid ${t.icon}`} aria-hidden='true' /> {t.name}
            </NavLink>
          ))}
          {canViewOperations && (
            <NavLink
              to='/org-dashboard'
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <i className='fa-solid fa-gauge-high' aria-hidden='true' /> Org Dashboard
            </NavLink>
          )}
          {isMd && (
            <NavLink
              to='/approvals'
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <i className='fa-solid fa-circle-check' aria-hidden='true' /> Approvals
              {pendingCount > 0 && (
                <span className={s.badge}>{pendingCount}</span>
              )}
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink
              to='/admin'
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <i className='fa-solid fa-screwdriver-wrench' aria-hidden='true' /> Admin
            </NavLink>
          )}
        </div>
      )}
    </nav>
  );
}
