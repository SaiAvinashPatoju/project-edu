import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white relative overflow-hidden">
      {/* Background Abstract Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Blue orb - top left */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"></div>
        {/* Yellow orb - top right */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-yellow-200/30 rounded-full blur-3xl"></div>
        {/* Teal orb - bottom left */}
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl"></div>
        {/* Large teal orb - right side */}
        <div className="absolute -right-20 top-1/3 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl"></div>
        {/* Coral accent - left middle */}
        <div className="absolute top-1/3 -left-10 w-48 h-48 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      {/* Floating Glass Navigation */}
      <nav className="relative z-50 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-blue-100/50 px-6 py-3">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-slate-900">Edu</span>
                  <span className="text-teal-600">Slides</span>
                </span>
              </Link>

              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-8">
                <Link href="#features" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">
                  Features
                </Link>
                <Link href="#pricing" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">
                  Pricing
                </Link>
                <Link href="#about" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">
                  About
                </Link>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="border-2 border-slate-200 text-slate-700 hover:border-teal-200 hover:text-teal-600 px-5 py-2 rounded-full font-medium transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-full font-medium shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Transform{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">
                Lectures
              </span>
              <br />
              into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">
                Slides
              </span>{' '}
              in Minutes
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0">
              AI-powered tools to create engaging presentations from your voice, instantly.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl shadow-teal-500/30 transition-all hover:-translate-y-1"
              >
                Get Started Free
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-white hover:text-teal-600 text-slate-700 border border-slate-200 hover:border-teal-200 px-8 py-4 rounded-full text-lg font-medium transition-all"
              >
                Watch Demo
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column - Floating Card Stack */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-80 h-80 md:w-96 md:h-96">
              {/* Back Card - Rotated Left */}
              <div className="absolute inset-0 bg-teal-100 rounded-3xl -rotate-6 transform origin-center shadow-xl"></div>

              {/* Middle Card - Rotated Right */}
              <div className="absolute inset-0 bg-teal-200 rounded-3xl rotate-3 transform origin-center shadow-xl"></div>

              {/* Front Card - Main Interface Mock */}
              <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl p-6 flex flex-col">
                {/* Card Header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="ml-auto flex gap-2">
                    <div className="w-16 h-5 rounded bg-slate-100"></div>
                    <div className="w-16 h-5 rounded bg-teal-100"></div>
                  </div>
                </div>

                {/* Slide Preview Mock */}
                <div className="flex-1 bg-slate-50 rounded-2xl p-4 flex flex-col">
                  {/* Slide Title Skeleton */}
                  <div className="h-6 bg-slate-200 rounded-lg w-3/4 mb-4"></div>

                  {/* Bullet Points Skeleton */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                      <div className="h-4 bg-slate-200 rounded w-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                      <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>

                  {/* Chart/Image Placeholder */}
                  <div className="mt-4 flex gap-3">
                    <div className="w-16 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="w-16 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-xl shadow-lg shadow-yellow-400/30 flex items-center justify-center transform rotate-12">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-teal-500 rounded-full shadow-lg shadow-teal-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Everything you need to create{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">
                amazing slides
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Powered by advanced AI that understands your lectures and creates beautiful presentations automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Record Lectures</h3>
              <p className="text-slate-600">
                High-quality audio capture directly in your browser with easy-to-use recording controls.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Processing</h3>
              <p className="text-slate-600">
                Advanced AI transcribes and automatically structures content into professional slide formats.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Edit & Export</h3>
              <p className="text-slate-600">
                Fine-tune slides with an intuitive editor, then export to PDF or PowerPoint formats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Ready to transform your lectures?
          </h2>
          <p className="text-lg text-slate-600 mb-10">
            Join educators who are saving hours every week with AI-powered slide generation.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-xl shadow-teal-500/30 transition-all hover:-translate-y-1"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}