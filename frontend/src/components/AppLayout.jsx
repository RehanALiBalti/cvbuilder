import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function AppLayout({ children, headerActions, mainClassName = "" }) {
  return (
    <div className="site-layout">
      <SiteHeader actions={headerActions} />
      <main className={`site-main ${mainClassName}`.trim()}>{children}</main>
      <SiteFooter />
    </div>
  );
}
