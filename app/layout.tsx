import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AP Voter Tracker", template: "%s | AP Voter Tracker" },
  description:
    "Every AP college football poll voter's weekly top-25 ballot, with conference-bias analysis and outlier detection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('apvt-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand">
              AP Voter Tracker
            </Link>
            <nav>
              <Link href="/">Consensus</Link>
              <Link href="/voters">Voters</Link>
              <Link href="/viz">Voter Report</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="inner">
            Poll data: AP Top 25 college football poll, &copy; The Associated Press. Ballot data compiled from{" "}
            <a href="https://collegepolltracker.com">collegepolltracker.com</a>. Independent project, not affiliated
            with or endorsed by the AP. See <Link href="/about">About</Link> for methodology.
          </div>
        </footer>
      </body>
    </html>
  );
}
