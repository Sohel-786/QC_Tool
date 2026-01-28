'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useLogin } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([false, false]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  // Blur placeholder - a tiny base64 encoded image for blur effect
  const blurDataURL =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQADAD8AktJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

  const images = ['/assets/Image1.jpg', '/assets/Image2.jpg'];

  // Preload all images on mount using link tags and Image objects
  useEffect(() => {
    // Add link preload tags to head
    images.forEach((src) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });

    // Also preload using Image objects for better browser support
    const preloadImages = images.map((src, index) => {
      const img = new window.Image();
      img.onload = () => {
        setImagesLoaded((prev) => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      };
      img.src = src;
      return img;
    });

    // Cleanup function
    return () => {
      images.forEach((src) => {
        const links = document.querySelectorAll(`link[href="${src}"]`);
        links.forEach((link) => link.remove());
      });
    };
  }, []);

  // Auto-switch images every 4 seconds with infinite loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % 2);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative z-10">
        <div className="w-full max-w-md">
          {/* Logo/Branding */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">QC</span>
              </div>
              <h1 className="text-2xl font-bold text-text">QC Tool System</h1>
            </div>
          </motion.div>

          {/* Sign In Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-text mb-2">Sign in</h2>
            <p className="text-secondary-600 mb-8">
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-text">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    {...register('username')}
                    className="pl-12 h-12 rounded-lg border-secondary-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-text">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className="pl-12 pr-12 h-12 rounded-lg border-secondary-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-md hover:shadow-lg transition-all"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Visual Background with Auto-Switching Images */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50">
        {/* Background SVG */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url('/assets/signin_background.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Auto-Switching Images with Slide Animation */}
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-primary-100 to-secondary-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <Image
                src={images[currentImageIndex]}
                alt={`Background ${currentImageIndex + 1}`}
                fill
                quality={80}
                placeholder="blur"
                blurDataURL={blurDataURL}
                className="object-cover transition-opacity duration-300"
                priority={true}
                sizes="50vw"
                onLoad={() => {
                  setImagesLoaded((prev) => {
                    const newState = [...prev];
                    newState[currentImageIndex] = true;
                    return newState;
                  });
                }}
              />
              {/* Overlay for better text readability if needed */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>
          
          {/* Preload next image off-screen */}
          <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
            <Image
              src={images[(currentImageIndex + 1) % 2]}
              alt="Preload next"
              width={1}
              height={1}
              quality={80}
              placeholder="blur"
              blurDataURL={blurDataURL}
              priority={true}
            />
          </div>
        </div>

        {/* Image Indicator Circles at Bottom */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
          {images.map((_, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={false}
              animate={{
                width: currentImageIndex === index ? 32 : 12,
                height: 12,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div
                className={`absolute inset-0 rounded-full backdrop-blur-md ${
                  currentImageIndex === index
                    ? 'bg-white/60'
                    : 'bg-white/30'
                }`}
                style={{
                  borderRadius: currentImageIndex === index ? '6px' : '50%',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Optional: Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-20 right-20 w-32 h-32 bg-primary-200/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, 20, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-20 left-20 w-40 h-40 bg-secondary-200/20 rounded-full blur-3xl"
          />
        </div>

        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-center p-12 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center text-white max-w-md"
          >
            <motion.h3
              className="text-4xl font-bold mb-4 drop-shadow-lg"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              Welcome Back
            </motion.h3>
            <p className="text-xl text-white/90 drop-shadow-md">
              Manage your QC tools efficiently
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
