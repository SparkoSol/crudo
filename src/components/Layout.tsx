import { Outlet } from 'react-router-dom';
import { EnvHeader } from './EnvHeader';

export function Layout() {
  return (
    <>
      <EnvHeader />
      <div className="pt-[60px]">
        <Outlet />
      </div>
    </>
  );
}
