import "./globals.css";

export const metadata = {
  title: "Private Rummy",
  description: "A simple private 6-player online rummy game"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
