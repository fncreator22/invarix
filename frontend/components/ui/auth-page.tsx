'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from './button';
import {
	AppleIcon,
	AtSignIcon,
	ChevronLeftIcon,
	Grid2x2PlusIcon,
} from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { CLERK_ENABLED } from '@/lib/auth-config';
import { toast } from 'sonner';

// Optional Clerk hooks (loaded conditionally if Clerk is enabled)
let useSignInHook: any = null;
let useSignUpHook: any = null;
try {
	const clerk = require('@clerk/nextjs');
	useSignInHook = clerk.useSignIn;
	useSignUpHook = clerk.useSignUp;
} catch {}

export function AuthPage({
	initialMode = 'sign-in',
}: {
	initialMode?: 'sign-in' | 'sign-up';
}) {
	const router = useRouter();
	const [mode, setMode] = useState<'sign-in' | 'sign-up'>(initialMode);
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Safe Clerk hooks (only invoked when ClerkProvider is active)
	const clerkSignIn = CLERK_ENABLED && useSignInHook ? useSignInHook() : null;
	const clerkSignUp = CLERK_ENABLED && useSignUpHook ? useSignUpHook() : null;

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
				toast.error(err?.errors?.[0]?.message || 'Authentication failed');
			}
		} else {
			toast.info('Clerk configured! Enter your Clerk keys in .env.local to activate live OAuth.', {
				description: 'Redirecting to Live Sandbox...',
			});
			setTimeout(() => {
				router.push('/w/northwind-pay/home');
			}, 1200);
		}
	};

	const handleEmailAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) {
			toast.error('Please enter a valid email address.');
			return;
		}

		if (CLERK_ENABLED && clerkSignIn?.signIn) {
			try {
				setIsLoading(true);
				const result = await clerkSignIn.signIn.create({
					identifier: email.trim(),
				});
				if (result.status === 'complete') {
					router.push('/workspaces');
				} else {
					toast.success('Check your email for your verification code!');
				}
			} catch (err: any) {
				setIsLoading(false);
				toast.error(err?.errors?.[0]?.message || 'Unable to sign in with email');
			}
		} else {
			toast.success(`Welcome ${email}! Entering developer workspace...`);
			setTimeout(() => {
				router.push('/workspaces');
			}, 800);
		}
	};

	return (
		<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
			{/* Left Column / Visual Brand Sidebar */}
			<div className="bg-muted/60 relative hidden h-full flex-col border-r border-border-subtle p-10 lg:flex">
				<div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent opacity-80" />
				<div className="z-10 flex items-center gap-2">
					<Grid2x2PlusIcon className="size-6 text-brand" />
					<p className="text-xl font-bold tracking-tight text-text-primary">INVARIX</p>
				</div>
				<div className="z-10 mt-auto pb-6">
					<blockquote className="space-y-2">
						<p className="text-xl text-text-primary font-medium leading-relaxed">
							&ldquo;Individually reasonable exceptions add up to one catastrophic collision.
							INVARIX intercepts compound cascading risk before merge.&rdquo;
						</p>
						<footer className="font-mono text-sm text-text-secondary font-semibold">
							~ Autonomous Architecture Safety Engine
						</footer>
					</blockquote>
				</div>
				<div className="absolute inset-0">
					<FloatingPaths position={1} />
					<FloatingPaths position={-1} />
				</div>
			</div>

			{/* Right Column / Authentication Form */}
			<div className="relative flex min-h-screen flex-col justify-center p-4">
				<div
					aria-hidden
					className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
				>
					<div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
					<div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
					<div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full" />
				</div>

				<Button variant="ghost" className="absolute top-7 left-5" asChild>
					<Link href="/">
						<ChevronLeftIcon className="size-4 me-2" />
						Home
					</Link>
				</Button>

				<div className="mx-auto space-y-4 sm:w-sm w-full max-w-sm">
					<div className="flex items-center gap-2 lg:hidden">
						<Grid2x2PlusIcon className="size-6 text-brand" />
						<p className="text-xl font-bold tracking-tight text-text-primary">INVARIX</p>
					</div>
					<div className="flex flex-col space-y-1">
						<h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
							{mode === 'sign-up' ? 'Create an Account' : 'Sign In or Join Now'}
						</h1>
						<p className="text-text-muted text-sm">
							{mode === 'sign-up'
								? 'Register your team and connect your architecture graph.'
								: 'Access your enterprise workspace and architecture graphs.'}
						</p>
					</div>

					{/* OAuth Providers */}
					<div className="space-y-2 pt-1">
						<Button
							type="button"
							size="lg"
							variant="outline"
							className="w-full justify-center text-sm font-medium border border-border-default bg-surface text-text-primary hover:bg-surface-sunken shadow-xs"
							disabled={isLoading}
							onClick={() => handleOAuth('oauth_google')}
						>
							<GoogleIcon className="size-4 me-2" />
							Continue with Google
						</Button>
						<Button
							type="button"
							size="lg"
							variant="outline"
							className="w-full justify-center text-sm font-medium border border-border-default bg-surface text-text-primary hover:bg-surface-sunken shadow-xs"
							disabled={isLoading}
							onClick={() => handleOAuth('oauth_apple')}
						>
							<AppleIcon className="size-4 me-2" />
							Continue with Apple
						</Button>
						<Button
							type="button"
							size="lg"
							variant="outline"
							className="w-full justify-center text-sm font-medium border border-border-default bg-surface text-text-primary hover:bg-surface-sunken shadow-xs"
							disabled={isLoading}
							onClick={() => handleOAuth('oauth_github')}
						>
							<GithubIcon className="size-4 me-2" />
							Continue with GitHub
						</Button>
					</div>

					<AuthSeparator />

					{/* Email Form */}
					<form onSubmit={handleEmailAuth} className="space-y-3">
						<p className="text-text-muted text-start text-xs">
							Enter your email address to sign in or create an account
						</p>
						<div className="relative h-max">
							<Input
								placeholder="your.email@example.com"
								className="peer ps-9 h-10 border border-border-default bg-surface text-text-primary focus:border-brand"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isLoading}
								required
							/>
							<div className="text-text-muted pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
								<AtSignIcon className="size-4" aria-hidden="true" />
							</div>
						</div>

						<Button type="submit" className="w-full h-10 bg-brand text-white hover:bg-brand/90 font-medium shadow-xs" disabled={isLoading}>
							<span>
								{isLoading
									? 'Connecting…'
									: mode === 'sign-up'
									? 'Create Account With Email'
									: 'Continue With Email'}
							</span>
						</Button>
					</form>

					<div className="pt-1 text-center text-xs text-text-muted">
						{mode === 'sign-up' ? (
							<span>
								Already have an account?{' '}
								<button
									type="button"
									onClick={() => setMode('sign-in')}
									className="text-brand hover:underline font-semibold"
								>
									Sign in
								</button>
							</span>
						) : (
							<span>
								Don&apos;t have an account?{' '}
								<button
									type="button"
									onClick={() => setMode('sign-up')}
									className="text-brand hover:underline font-semibold"
								>
									Sign up
								</button>
							</span>
						)}
					</div>

					<div className="pt-2 text-center">
						<Link
							href="/w/northwind-pay/home"
							className="text-xs text-brand hover:underline font-medium"
						>
							Launch Live Sandbox (0 Login) &rarr;
						</Link>
					</div>

					<p className="text-text-muted text-center mt-6 text-xs leading-relaxed">
						By clicking continue, you agree to our{' '}
						<Link
							href="/terms"
							className="hover:text-text-primary underline underline-offset-4"
						>
							Terms of Service
						</Link>{' '}
						and{' '}
						<Link
							href="/privacy"
							className="hover:text-text-primary underline underline-offset-4"
						>
							Privacy Policy
						</Link>
						.
					</p>
				</div>
			</div>
		</main>
	);
}

function FloatingPaths({ position }: { position: number }) {
	const paths = Array.from({ length: 36 }, (_, i) => ({
		id: i,
		d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
			380 - i * 5 * position
		} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
			152 - i * 5 * position
		} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
			684 - i * 5 * position
		} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
		color: `rgba(15,23,42,${0.1 + i * 0.03})`,
		width: 0.5 + i * 0.03,
	}));

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			<svg
				className="h-full w-full text-brand/40 dark:text-brand/30"
				viewBox="0 0 696 316"
				fill="none"
			>
				<title>Background Paths</title>
				{paths.map((path) => (
					<motion.path
						key={path.id}
						d={path.d}
						stroke="currentColor"
						strokeWidth={path.width}
						strokeOpacity={0.1 + path.id * 0.03}
						initial={{ pathLength: 0.3, opacity: 0.6 }}
						animate={{
							pathLength: 1,
							opacity: [0.3, 0.6, 0.3],
							pathOffset: [0, 1, 0],
						}}
						transition={{
							duration: 20 + Math.random() * 10,
							repeat: Number.POSITIVE_INFINITY,
							ease: 'linear',
						}}
					/>
				))}
			</svg>
		</div>
	);
}

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		{...props}
	>
		<g>
			<path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
		</g>
	</svg>
);

const GithubIcon = (props: React.ComponentProps<'svg'>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		{...props}
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
		/>
	</svg>
);

const AuthSeparator = () => {
	return (
		<div className="flex w-full items-center justify-center my-1">
			<div className="bg-border-subtle h-px w-full" />
			<span className="text-text-muted px-2.5 text-xs font-mono uppercase">OR</span>
			<div className="bg-border-subtle h-px w-full" />
		</div>
	);
};
