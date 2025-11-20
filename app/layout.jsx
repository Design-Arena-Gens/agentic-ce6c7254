export const metadata = {
  title: "Car Video Generator",
  description: "Generate a simple animated car video in your browser",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}

