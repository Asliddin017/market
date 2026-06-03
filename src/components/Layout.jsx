import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './Navbar'

/** App shell: persistent navbar + per-route enter animation. */
export default function Layout() {
  const location = useLocation()
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/*
          Keying the wrapper on the pathname remounts it on every navigation, so
          the page below mounts fresh (and fetches its data) and the enter
          animation replays — navigation behaves exactly like an F5 of that route.

          We deliberately do NOT wrap this in <AnimatePresence mode="wait">:
          waiting for the previous page's exit animation while the keyed <Outlet/>
          already renders the new route can deadlock framer-motion's presence
          tracking, leaving the body blank (just the navbar) until the next
          navigation or refresh. Mounting the new page immediately is what makes
          a Link/NavLink click reliably show loading -> data, never a blank body.
        */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
