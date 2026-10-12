import "./globals.css";

export const metadata = {
  title: "JEE Compass | Preparation Platform",
  description: "A focused workspace for JEE preparation.",
};

// Runs before first paint so the saved theme is applied immediately on every page.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem("jee-theme")==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
