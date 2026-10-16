'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import {
	AtSignIcon,
	ChevronLeftIcon,
	EyeIcon,
	EyeOffIcon,
	LockIcon,
	UserIcon,
	Loader2Icon,
	KeyRoundIcon,
	CheckCircle2Icon,
} from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { CLERK_ENABLED } from '@/lib/auth-config';
import { toast } from 'sonner';
import { LogoMark } from '@/components/logo';
import {
	GoogleBrandLogo,
	AppleBrandLogo,
	GitHubBrandLogo,
} from '@/components/icons/brand-logos';

// Safe Clerk hook imports
let useSignInHook: any = null;
let useSignUpHook: any = null;
try {
	const clerk = require('@clerk/nextjs');
	useSignInHook = clerk.useSignIn;
	useSignUpHook = clerk.useSignUp;
} catch {}

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

export function AuthPage({
	initialMode = 'sign-in',
}: {
	initialMode?: 'sign-in' | 'sign-up';
}) {
	const router = useRouter();
	const [mode, setMode] = useState<AuthMode>(initialMode);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [fullName, setFullName] = useState('');
	const [resetCode, setResetCode] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [resetCodeSent, setResetCodeSent] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Safe Clerk hooks (only active when Clerk keys are present)
	const clerkSignIn = CLERK_ENABLED && useSignInHook ? useSignInHook() : null;
	const clerkSignUp = CLERK_ENABLED && useSignUpHook ? useSignUpHook() : null;

	// OAuth Handler
	const handleOAuth = async (strategy: 'oauth_google' | 'oauth_apple' | 'oauth_github') => {
		if (CLERK_ENABLED && clerkSignIn?.signIn) {
			try {
				setIsLoading(true);
				await clerkSignIn.signIn.authenticateWithRedirect({
					strategy,
					redirectUrl: '/sso-callback',
					redirectUrlComplete: '/workspaces',
				});
			} catch (err: any) {
				setIsLoading(false);
				toast.error(err?.errors?.[0]?.message || 'OAuth authentication failed');
			}
		} else {
			toast.info('Clerk configured! Enter your Clerk keys in .env.local to activate live OAuth.', {
				description: 'Redirecting to Live Sandbox...',
			});
			setTimeout(() => {
				router.push('/w/northwind-pay/home');
			}, 900);
		}
	};

	// Email/Password Submit Handler
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		if (mode === 'forgot-password') {
			if (!resetCodeSent) {
				// Send reset code
				if (CLERK_ENABLED && clerkSignIn?.signIn) {
					try {
						await clerkSignIn.signIn.create({
							strategy: 'reset_password_email_code',
							identifier: email,
						});
						setResetCodeSent(true);
						setIsLoading(false);
						toast.success(`Password reset code sent to ${email}`);
					} catch (err: any) {
						setIsLoading(false);
						toast.error(err?.errors?.[0]?.message || 'Failed to send reset code');
					}
				} else {
					setTimeout(() => {
						setResetCodeSent(true);
						setIsLoading(false);
						toast.success(`Simulation: Reset code sent to ${email}`);
					}, 600);
				}
			} else {
				// Verify code & update password
				if (CLERK_ENABLED && clerkSignIn?.signIn) {
					try {
						const res = await clerkSignIn.signIn.attemptFirstFactor({
							strategy: 'reset_password_email_code',
							code: resetCode,
							password,
						});
						if (res.status === 'complete') {
							await clerkSignIn.setActive({ session: res.createdSessionId });
							toast.success('Password updated successfully!');
							router.push('/workspaces');
						}
					} catch (err: any) {
						setIsLoading(false);
						toast.error(err?.errors?.[0]?.message || 'Invalid reset code');
					}
				} else {
					setTimeout(() => {
						setIsLoading(false);
						toast.success('Simulation: Password reset successful! Redirecting to sign in...');
						setMode('sign-in');
						setResetCodeSent(false);
					}, 700);
				}
			}
			return;
		}

		if (mode === 'sign-up') {
			if (password !== confirmPassword) {
				setIsLoading(false);
				toast.error('Passwords do not match');
				return;
			}
			if (CLERK_ENABLED && clerkSignUp?.signUp) {
				try {
					const res = await clerkSignUp.signUp.create({
						emailAddress: email,
						password,
						firstName: fullName,
					});
					if (res.status === 'complete') {
						await clerkSignUp.setActive({ session: res.createdSessionId });
						router.push('/onboarding');
					} else {
						toast.info('Verification required. Please check your email.');
					}
				} catch (err: any) {
					setIsLoading(false);
					toast.error(err?.errors?.[0]?.message || 'Sign up failed');
				}
			} else {
				toast.success(`Account created for ${email || 'user'}!`, {
					description: 'Live Clerk auth activates once keys are set in .env.local.',
				});
				setTimeout(() => {
					router.push('/w/northwind-pay/home');
				}, 800);
			}
			return;
		}

		// Sign-In
		if (CLERK_ENABLED && clerkSignIn?.signIn) {
			try {
				const res = await clerkSignIn.signIn.create({
					identifier: email,
					password: password || undefined,
				});
				if (res.status === 'complete') {
					await clerkSignIn.setActive({ session: res.createdSessionId });
					router.push('/workspaces');
				}
			} catch (err: any) {
				setIsLoading(false);
				toast.error(err?.errors?.[0]?.message || 'Invalid email or password');
			}
		} else {
			toast.success(`Authenticated as ${email || 'guest'}!`, {
				description: 'Routing to live workspace...',
			});
			setTimeout(() => {
				router.push('/w/northwind-pay/home');
			}, 700);
		}
	};

	return (
		<main className="relative min-h-screen w-full overflow-hidden bg-[#09090b] text-white flex flex-col lg:flex-row">
			{/* BRAND & VISUAL ANIMATION PANEL */}
			<motion.div
				layout
				transition={{ type: 'spring', stiffness: 220, damping: 28 }}
				className={cn(
					'relative hidden h-screen flex-col justify-between p-10 lg:flex lg:w-1/2 overflow-hidden border-zinc-800/80 bg-[#0c0d12]',
					mode === 'sign-up' ? 'lg:order-2 border-l' : 'lg:order-1 border-r'
				)}
			>
				{/* Ambient Glows */}
				<div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-brand/15 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-cyan-500/10 blur-3xl" />

				{/* Brand Header */}
				<div className="z-20 flex items-center gap-3">
					<LogoMark variant="aurora" className="size-8" />
					<span className="font-display text-xl font-extrabold tracking-[0.08em] text-white uppercase">
						INVARIX
					</span>
				</div>

				{/* Flowing Ribbon Canvas */}
				<div className="absolute inset-0 pointer-events-none">
					<FloatingPaths />
				</div>

				{/* Quote Footer */}
				<div className="z-20 mt-auto pb-6">
					<blockquote className="space-y-3 max-w-md">
						<p className="text-xl text-zinc-100 font-medium leading-relaxed drop-shadow-sm">
							&ldquo;Individually reasonable exceptions add up to one catastrophic collision.
							INVARIX intercepts compound cascading risk before merge.&rdquo;
						</p>
						<footer className="font-mono text-sm text-zinc-400 font-medium">
							~ Autonomous Architecture Safety Engine
						</footer>
					</blockquote>
				</div>
			</motion.div>

			{/* AUTHENTICATION FORM PANEL */}
			<motion.div
				layout
				transition={{ type: 'spring', stiffness: 220, damping: 28 }}
				className={cn(
					'relative flex min-h-screen flex-col justify-center p-6 sm:p-12 lg:w-1/2 overflow-y-auto bg-[#09090b]',
					mode === 'sign-up' ? 'lg:order-1' : 'lg:order-2'
				)}
			>
				{/* Background radial glow */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 isolate -z-10 opacity-40 overflow-hidden"
				>
					<div className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent absolute top-0 right-0 h-96 w-96 rounded-full blur-2xl" />
				</div>

				{/* Home Back Link */}
				<Button
					variant="ghost"
					className="absolute top-6 left-6 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
					asChild
				>
					<Link href="/">
						<ChevronLeftIcon className="size-4 me-1.5" />
						Home
					</Link>
				</Button>

				{/* Form Container */}
				<div className="mx-auto w-full max-w-sm space-y-6 pt-12 lg:pt-0">
					{/* Mobile Brand Header */}
					<div className="flex items-center gap-2.5 lg:hidden mb-2">
						<LogoMark variant="aurora" className="size-7" />
						<span className="font-display text-lg font-bold tracking-wider text-white">
							INVARIX
						</span>
					</div>

					{/* Title & Subtitle with smooth transition */}
					<AnimatePresence mode="wait">
						<motion.div
							key={mode}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.18 }}
							className="space-y-1.5 text-left"
						>
							<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
								{mode === 'sign-up'
									? 'Create Your Account'
									: mode === 'forgot-password'
									? 'Reset Your Password'
									: 'Sign In or Join Now!'}
							</h1>
							<p className="text-sm text-zinc-400">
								{mode === 'sign-up'
									? 'Join INVARIX to intercept compound cascading architecture risk.'
									: mode === 'forgot-password'
									? 'Enter your email to receive a password reset code.'
									: 'Access your enterprise workspace and architecture graphs.'}
							</p>
						</motion.div>
					</AnimatePresence>

					{/* OAuth Buttons (shown in sign-in & sign-up modes) */}
					{mode !== 'forgot-password' && (
						<div className="space-y-2.5">
							<button
								type="button"
								onClick={() => handleOAuth('oauth_google')}
								disabled={isLoading}
								className="group relative flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-[#f4f4f5] px-4 text-sm font-semibold text-[#18181b] shadow-xs transition-all hover:bg-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
							>
								<GoogleBrandLogo className="size-5 shrink-0" />
								<span>Continue with Google</span>
							</button>

							<button
								type="button"
								onClick={() => handleOAuth('oauth_apple')}
								disabled={isLoading}
								className="group relative flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-[#f4f4f5] px-4 text-sm font-semibold text-[#18181b] shadow-xs transition-all hover:bg-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
							>
								<AppleBrandLogo className="size-5 shrink-0 text-[#18181b]" />
								<span>Continue with Apple</span>
							</button>

							<button
								type="button"
								onClick={() => handleOAuth('oauth_github')}
								disabled={isLoading}
								className="group relative flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-[#f4f4f5] px-4 text-sm font-semibold text-[#18181b] shadow-xs transition-all hover:bg-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
							>
								<GitHubBrandLogo className="size-5 shrink-0 text-[#18181b]" />
								<span>Continue with GitHub</span>
							</button>

							<div className="relative my-4 flex items-center justify-center">
								<div className="h-px w-full bg-zinc-800" />
								<span className="bg-[#09090b] px-3 font-mono text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
									OR
								</span>
								<div className="h-px w-full bg-zinc-800" />
							</div>
						</div>
					)}

					{/* Main Form */}
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Full Name (Sign-up only) */}
						{mode === 'sign-up' && (
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-zinc-300">Full Name</label>
								<div className="relative">
									<Input
										placeholder="Sarah Chen"
										type="text"
										value={fullName}
										onChange={(e) => setFullName(e.target.value)}
										disabled={isLoading}
										required
										className="h-11 rounded-lg border-zinc-700/80 bg-zinc-900/90 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-brand focus:ring-1 focus:ring-brand"
									/>
									<UserIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
								</div>
							</div>
						)}

						{/* Email Input */}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-zinc-300">
								{mode === 'forgot-password'
									? 'Registered Email'
									: 'Enter your email address'}
							</label>
							<div className="relative">
								<Input
									placeholder="your.email@example.com"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={isLoading || (mode === 'forgot-password' && resetCodeSent)}
									required
									className="h-11 rounded-lg border-zinc-700/80 bg-zinc-900/90 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-brand focus:ring-1 focus:ring-brand"
								/>
								<AtSignIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
							</div>
						</div>

						{/* Password Field (for sign-in, sign-up, or password reset confirmation) */}
						{(mode === 'sign-in' || mode === 'sign-up' || (mode === 'forgot-password' && resetCodeSent)) && (
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="text-xs font-medium text-zinc-300">
										{mode === 'forgot-password' ? 'New Password' : 'Password'}
									</label>
									{mode === 'sign-in' && (
										<button
											type="button"
											onClick={() => setMode('forgot-password')}
											className="text-xs font-medium text-violet-400 hover:text-violet-300 hover:underline transition-colors"
										>
											Forgot password?
										</button>
									)}
								</div>
								<div className="relative">
									<Input
										placeholder="••••••••••••"
										type={showPassword ? 'text' : 'password'}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										disabled={isLoading}
										required
										className="h-11 rounded-lg border-zinc-700/80 bg-zinc-900/90 pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-brand focus:ring-1 focus:ring-brand"
									/>
									<LockIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
										tabIndex={-1}
									>
										{showPassword ? (
											<EyeOffIcon className="size-4" />
										) : (
											<EyeIcon className="size-4" />
										)}
									</button>
								</div>
							</div>
						)}

						{/* Confirm Password (Sign-up only) */}
						{mode === 'sign-up' && (
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-zinc-300">Confirm Password</label>
								<div className="relative">
									<Input
										placeholder="••••••••••••"
										type={showPassword ? 'text' : 'password'}
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										disabled={isLoading}
										required
										className="h-11 rounded-lg border-zinc-700/80 bg-zinc-900/90 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-brand focus:ring-1 focus:ring-brand"
									/>
									<LockIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
								</div>
							</div>
						)}

						{/* Reset Code Input (Forgot Password step 2) */}
						{mode === 'forgot-password' && resetCodeSent && (
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-zinc-300">Verification Code</label>
								<div className="relative">
									<Input
										placeholder="6-digit reset code"
										type="text"
										value={resetCode}
										onChange={(e) => setResetCode(e.target.value)}
										disabled={isLoading}
										required
										className="h-11 rounded-lg border-zinc-700/80 bg-zinc-900/90 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-brand focus:ring-1 focus:ring-brand"
									/>
									<KeyRoundIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
								</div>
							</div>
						)}

						{/* Submit Button */}
						<Button
							type="submit"
							disabled={isLoading}
							className="h-11 w-full rounded-lg bg-[#f4f4f5] text-sm font-semibold text-[#18181b] shadow-xs hover:bg-white active:scale-[0.98] transition-all cursor-pointer"
						>
							{isLoading ? (
								<span className="flex items-center gap-2">
									<Loader2Icon className="size-4 animate-spin" />
									Connecting…
								</span>
							) : mode === 'sign-up' ? (
								'Create Account With Email'
							) : mode === 'forgot-password' ? (
								resetCodeSent ? 'Reset Password' : 'Send Reset Code'
							) : (
								'Continue With Email'
							)}
						</Button>
					</form>

					{/* Navigation Toggles & Links */}
					<div className="space-y-3 pt-2 text-center text-xs text-zinc-400">
						{mode === 'sign-in' ? (
							<p>
								Don&apos;t have an account?{' '}
								<button
									type="button"
									onClick={() => setMode('sign-up')}
									className="font-semibold text-violet-400 hover:text-violet-300 hover:underline transition-colors cursor-pointer"
								>
									Sign up
								</button>
							</p>
						) : mode === 'sign-up' ? (
							<p>
								Already have an account?{' '}
								<button
									type="button"
									onClick={() => setMode('sign-in')}
									className="font-semibold text-violet-400 hover:text-violet-300 hover:underline transition-colors cursor-pointer"
								>
									Sign in
								</button>
							</p>
						) : (
							<button
								type="button"
								onClick={() => {
									setMode('sign-in');
									setResetCodeSent(false);
								}}
								className="font-semibold text-violet-400 hover:text-violet-300 hover:underline transition-colors cursor-pointer"
							>
								← Back to Sign in
							</button>
						)}

						<div>
							<Link
								href="/w/northwind-pay/home"
								className="font-mono text-xs text-violet-400/80 hover:text-violet-300 hover:underline"
							>
								Launch Live Sandbox (0 Login) →
							</Link>
						</div>

						<p className="text-[11px] text-zinc-500 leading-normal">
							By clicking continue, you agree to our{' '}
							<Link href="/terms" className="underline underline-offset-2 hover:text-zinc-300">
								Terms of Service
							</Link>{' '}
							and{' '}
							<Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-300">
								Privacy Policy
							</Link>
							.
						</p>
					</div>
				</div>
			</motion.div>
		</main>
	);
}

/**
 * Luminous Sweeping Ribbons Animation Canvas
 * Matches the glowing curvature and flowing aesthetic of the reference template.
 */
function FloatingPaths() {
	// Generate 40 smooth flowing Bezier ribbon paths matching the reference template arc
	const paths = React.useMemo(() => {
		return Array.from({ length: 40 }, (_, i) => {
			const offset = i * 14;
			const sag = 50 + i * 8;
			return {
				id: i,
				d: `M -60 ${160 + offset} C ${200 + i * 8} ${240 + offset + sag}, ${460 + i * 10} ${380 + offset + sag}, ${880} ${560 + offset}`,
				strokeWidth: 0.9 + (i % 4) * 0.45,
				opacity: 0.25 + (i / 40) * 0.65,
				duration: 15 + (i % 6) * 3,
				delay: (i % 5) * 0.8,
			};
		});
	}, []);

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			<svg
				className="h-full w-full"
				viewBox="0 0 800 800"
				fill="none"
				preserveAspectRatio="xMidYMid slice"
			>
				<defs>
					<linearGradient id="auroraRibbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
						<stop offset="35%" stopColor="#DDD6FE" stopOpacity="0.75" />
						<stop offset="70%" stopColor="#38BDF8" stopOpacity="0.7" />
						<stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
					</linearGradient>
				</defs>

				{paths.map((p) => (
					<motion.path
						key={p.id}
						d={p.d}
						stroke="url(#auroraRibbonGradient)"
						strokeWidth={p.strokeWidth}
						strokeOpacity={p.opacity}
						strokeLinecap="round"
						initial={{
							pathLength: 0.35,
							pathOffset: 0,
							opacity: p.opacity * 0.7,
						}}
						animate={{
							pathLength: [0.35, 0.95, 0.35],
							pathOffset: [0, 1, 0],
							opacity: [p.opacity * 0.6, p.opacity, p.opacity * 0.6],
						}}
						transition={{
							duration: p.duration,
							delay: p.delay,
							repeat: Number.POSITIVE_INFINITY,
							ease: 'easeInOut',
						}}
					/>
				))}
			</svg>
		</div>
	);
}
