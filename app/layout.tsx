import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Experiência dos usuários | UBS Arapongas',
  description: 'Pesquisa de experiência dos usuários da UBS Arapongas — Araranguá/SC.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
