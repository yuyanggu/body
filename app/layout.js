import Script from 'next/script';
import './globals.css';

export const metadata = {
    title: 'Residual Motion',
    description: 'Body as interface — camera-based pose detection drives a particle visualization for ACL recovery',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                {children}
                <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core" strategy="beforeInteractive" />
                <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter" strategy="beforeInteractive" />
                <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl" strategy="beforeInteractive" />
                <Script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection" strategy="beforeInteractive" />
            </body>
        </html>
    );
}
