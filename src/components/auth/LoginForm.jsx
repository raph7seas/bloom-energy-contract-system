import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Figma assets
const imgVector = "/assets/f086e7917c3cd7e9b600565f5e3d0f282e9543fd.svg";
const imgVector1 = "/assets/68418235347948b935468dec8f3fb8c2af3c37aa.svg";
const imgVector2 = "/assets/e331c1a6a40f323e15437e8158678fdfabb054c2.svg";
const imgVector3 = "/assets/938a6eed20b2174b2133de2f58a55770e0b2c359.svg";
const img = "/assets/5bd483445ff776019128324fe061a62fdd0178d4.svg";
const img1 = "/assets/61b7cf5659eb7e51447b47d7a82d219611fb7793.svg";
const img2 = "/assets/39eba15b7df173ce5b0ed1097d7ea35ce1b64a99.svg";
const img3 = "/assets/3b1aba9374e2487a9c6afa733fdc3424fcbf6644.svg";
const img4 = "/assets/b3a80785b2375449ff46fa8d7040828cb3318220.svg";
const img5 = "/assets/09a08cbf1465634051d6b4dfef2565db97685cbb.svg";
const img6 = "/assets/783c67c7e3c9ec99198f6da0a516d9f629e3bf42.svg";
const img7 = "/assets/f9f969fb2e1fdde49e75ea8e3401cf7409e3d500.svg";
const img8 = "/assets/8f76e5a2ac9a4908447bf10971aeccc3f0916aa6.svg";
const img9 = "/assets/f28e4c2f6bfdf68bc8bd214a0d7ce3f810a68a35.svg";
const img10 = "/assets/e07bfb89adac2642cb4a9e289dec9b01b67c9372.svg";
const img11 = "/assets/c379027dcf4bea6bd49bd9763b96d911dcf783af.svg";
const imgLine33 = "/assets/8b79777c9cd70a5f83618286686f2c567907afff.svg";
const backgroundImage = "/assets/c68b953f0b453b3661d407f5f868bd73e02996a5.png";

// Component: SmallLogo
function SmallLogo() {
  return (
    <div className="relative w-[76px] h-[76px]">
      <div className="absolute" style={{ top: '61.93%', right: '33.3%', bottom: '4.3%', left: '37.34%' }}>
        <img alt="" className="w-full h-full object-contain" src={imgVector} />
      </div>
      <div className="absolute" style={{ top: '5.3%', right: '6.58%', bottom: '4.67%', left: '6.08%' }}>
        <img alt="" className="w-full h-full object-contain" src={imgVector1} />
      </div>
    </div>
  );
}

// Component: EyeOff Icon
function EyeOff() {
  return (
    <div className="relative w-4 h-4">
      <div className="absolute" style={{ top: '16.67%', right: '4.17%', bottom: '16.67%', left: '4.17%' }}>
        <img alt="" className="w-full h-full object-contain" src={imgVector2} />
      </div>
      <div className="absolute" style={{ top: '4.167%', right: '4.167%', bottom: '4.167%', left: '4.167%' }}>
        <img alt="" className="w-full h-full object-contain" src={imgVector3} />
      </div>
    </div>
  );
}

// Component: Footer Logo
function FooterLogo() {
  return (
    <svg width="104" height="17" viewBox="0 0 104 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_5082_23)">
        <path d="M12.6286 12.3636C11.182 12.3636 10.2437 11.6682 10.2437 10.0068V0.154541H12.3941V9.65909C12.3941 10.1614 12.5114 10.5091 13.2542 10.5091C13.4497 10.5091 13.4888 10.5091 13.6061 10.5091V12.2477C13.1369 12.325 13.0587 12.3636 12.6286 12.3636Z" fill="#1F3045"/>
        <path d="M19.7835 5.71815C19.5099 5.40905 19.0407 5.17724 18.4542 5.17724C17.8677 5.17724 17.3986 5.44769 17.1249 5.71815C16.6166 6.25905 16.4993 7.10906 16.4993 7.92042C16.4993 8.73178 16.6166 9.54315 17.1249 10.1227C17.3986 10.4318 17.8677 10.6636 18.4542 10.6636C19.0407 10.6636 19.5099 10.4318 19.7835 10.1227C20.2918 9.58178 20.4091 8.77042 20.4091 7.92042C20.4091 7.07042 20.2918 6.25905 19.7835 5.71815ZM21.5429 11.1272C20.9174 11.8613 19.7835 12.4795 18.4542 12.4795C17.1249 12.4795 15.9911 11.8613 15.3655 11.1272C14.7008 10.3159 14.3489 9.3886 14.3489 7.92042C14.3489 6.45224 14.7008 5.52496 15.3655 4.7136C15.9911 3.97951 17.1249 3.36133 18.4542 3.36133C19.7835 3.36133 20.9174 3.97951 21.5429 4.7136C22.2076 5.52496 22.5595 6.45224 22.5595 7.92042C22.5595 9.34996 22.2076 10.2772 21.5429 11.1272Z" fill="#1F3045"/>
        <path d="M29.0887 5.71815C28.815 5.40905 28.3459 5.17724 27.7594 5.17724C27.1729 5.17724 26.7038 5.44769 26.4301 5.71815C25.9218 6.25905 25.8045 7.10906 25.8045 7.92042C25.8045 8.73178 25.9218 9.54315 26.4301 10.1227C26.7038 10.4318 27.1729 10.6636 27.7594 10.6636C28.3459 10.6636 28.815 10.4318 29.0887 10.1227C29.597 9.58178 29.7143 8.77042 29.7143 7.92042C29.7143 7.07042 29.597 6.25905 29.0887 5.71815ZM30.8481 11.1272C30.2226 11.8613 29.0887 12.4795 27.7594 12.4795C26.4301 12.4795 25.2962 11.8613 24.6707 11.1272C24.006 10.3159 23.6541 9.3886 23.6541 7.92042C23.6541 6.45224 24.006 5.52496 24.6707 4.7136C25.2962 3.97951 26.4301 3.36133 27.7594 3.36133C29.0887 3.36133 30.2226 3.97951 30.8481 4.7136C31.5128 5.52496 31.8647 6.45224 31.8647 7.92042C31.8647 9.34996 31.5128 10.2772 30.8481 11.1272Z" fill="#1F3045"/>
        <path d="M43.6332 12.2477V6.8386C43.6332 5.75678 43.3596 5.1386 42.2648 5.1386C41.0528 5.1386 40.5445 6.37496 40.5445 7.49542V12.2477H38.4332V6.8386C38.4332 5.75678 38.1596 5.1386 37.0648 5.1386C35.8528 5.1386 35.3054 6.37496 35.3054 7.49542V12.2477H33.1941V3.55451H34.9535L35.1099 4.7136C35.5791 3.90224 36.4392 3.36133 37.6122 3.36133C38.8633 3.36133 39.6844 3.90224 40.1144 4.79087C40.6227 3.90224 41.6002 3.36133 42.7731 3.36133C44.6498 3.36133 45.6272 4.59769 45.6272 6.4136V12.2863L43.6332 12.2477Z" fill="#1F3045"/>
        <path d="M53.1728 5.52496C52.8991 5.21587 52.4299 5.02269 51.8435 5.02269C51.2179 5.02269 50.6705 5.29315 50.3577 5.67951C50.045 6.06587 49.9277 6.45224 49.8886 7.03178H53.681C53.681 6.37496 53.4856 5.87269 53.1728 5.52496ZM55.7923 8.5386H49.9277C49.8886 9.19542 50.1622 9.85224 50.5532 10.2386C50.866 10.5091 51.2961 10.7795 51.8435 10.7795C52.469 10.7795 52.8209 10.6636 53.1337 10.3545C53.3292 10.1613 53.4856 9.92951 53.5638 9.62042H55.5968C55.5577 10.1227 55.2059 10.8181 54.854 11.2431C54.1111 12.1318 53.0164 12.4795 51.8825 12.4795C50.6705 12.4795 49.8104 12.0545 49.1066 11.3977C48.2074 10.5477 47.7382 9.34996 47.7382 7.92042C47.7382 6.52951 48.1683 5.29315 48.9893 4.44315C49.654 3.78633 50.5923 3.36133 51.8044 3.36133C53.0946 3.36133 54.3066 3.8636 55.0104 4.98405C55.6359 5.94996 55.7923 6.91587 55.7532 7.99769C55.8314 7.95906 55.7923 8.38406 55.7923 8.5386Z" fill="#3DAE2B"/>
        <path d="M62.8301 12.2478V6.91594C62.8301 5.91139 62.4782 5.29321 61.3835 5.29321C60.6406 5.29321 60.1323 5.75684 59.8586 6.41366C59.5459 7.10912 59.585 7.99775 59.585 8.73184V12.2864H57.4737V3.55457H59.2331L59.3895 4.67503C59.8977 3.74775 60.9534 3.32275 61.9699 3.32275C63.8466 3.32275 64.9413 4.63639 64.9413 6.41366V12.2091H62.8301V12.2478Z" fill="#3DAE2B"/>
        <path d="M71.9009 5.52496C71.6272 5.21587 71.158 5.02269 70.5716 5.02269C69.946 5.02269 69.3986 5.29315 69.0859 5.67951C68.7731 6.06587 68.6558 6.45224 68.6167 7.03178H72.4092C72.4092 6.37496 72.2528 5.87269 71.9009 5.52496ZM74.5205 8.5386H68.6167C68.6167 9.19542 68.8513 9.85224 69.2423 10.2386C69.555 10.5091 69.9851 10.7795 70.5325 10.7795C71.158 10.7795 71.5099 10.6636 71.8227 10.3545C72.0182 10.1613 72.1746 9.92951 72.2528 9.62042H74.2859C74.2468 10.1227 73.8949 10.8181 73.543 11.2431C72.8002 12.1318 71.7054 12.4795 70.5716 12.4795C69.3595 12.4795 68.4994 12.0545 67.7956 11.3977C66.9355 10.5477 66.4272 9.34996 66.4272 7.92042C66.4272 6.52951 66.8573 5.29315 67.6783 4.44315C68.343 3.78633 69.2814 3.36133 70.4934 3.36133C71.7836 3.36133 72.9956 3.8636 73.6994 4.98405C74.325 5.94996 74.4814 6.91587 74.4814 7.99769C74.5595 7.95906 74.5205 8.38406 74.5205 8.5386Z" fill="#3DAE2B"/>
        <path d="M80.5804 5.40905C79.0947 5.40905 78.3127 6.45224 78.3127 7.88178V12.2477H76.1623V3.55451H77.9608L78.1563 4.86814C78.5473 3.8636 79.6029 3.4386 80.6586 3.4386C80.8932 3.4386 81.0886 3.47724 81.3232 3.47724V5.48633C81.0886 5.44769 80.815 5.40905 80.5804 5.40905Z" fill="#3DAE2B"/>
        <path d="M85.6242 4.90674C84.6468 4.90674 84.0603 5.60219 84.0603 6.52947C84.0603 7.45674 84.6468 8.15219 85.6242 8.15219C86.6017 8.15219 87.1881 7.49537 87.1881 6.52947C87.1881 5.60219 86.6017 4.90674 85.6242 4.90674ZM86.0152 12.3636H84.3731C83.9039 12.5181 83.5911 12.8658 83.5911 13.4454C83.5911 14.5658 84.9596 14.6431 85.8197 14.6431C86.6799 14.6431 88.1656 14.6045 88.1656 13.4454C88.1265 12.3636 86.7972 12.3636 86.0152 12.3636ZM85.8588 16.3045C84.8032 16.3045 83.6693 16.2272 82.731 15.5704C82.0663 15.1067 81.6753 14.4886 81.6753 13.6772C81.6753 12.9045 82.0663 12.2476 82.731 11.8999C82.1836 11.5908 81.8708 10.9726 81.8708 10.3931C81.8708 9.65901 82.2227 9.07947 82.9265 8.65447C82.3791 8.11356 82.0663 7.4181 82.0663 6.52947C82.0663 4.4431 83.7084 3.32265 85.6633 3.32265C86.4062 3.32265 87.0708 3.51583 87.6573 3.86356C88.0092 3.12947 88.7129 2.78174 89.4558 2.78174C89.5731 2.78174 89.8859 2.78174 90.0423 2.82037V4.4431C90.0032 4.4431 89.925 4.4431 89.8859 4.4431C89.3776 4.4431 88.9475 4.59765 88.8302 4.98401C89.1039 5.44765 89.2994 5.94992 89.2994 6.5681C89.2994 8.53856 87.6182 9.73628 85.7024 9.73628C85.1941 9.73628 84.725 9.65901 84.2949 9.50447C84.0994 9.62037 83.8648 9.85219 83.8648 10.1226C83.8648 10.6249 84.3731 10.7795 84.8423 10.7795H86.2889C87.1881 10.7795 88.322 10.7795 89.143 11.359C89.8859 11.8613 90.1987 12.5954 90.1987 13.4454C90.1205 15.6863 87.8137 16.3045 85.8588 16.3045Z" fill="#3DAE2B"/>
        <path d="M95.9068 13.7159C95.4768 14.8363 94.7339 15.8795 93.2091 15.8795C92.5053 15.8795 92.0362 15.7636 91.567 15.6477V13.9091C92.1144 14.025 92.2708 14.0636 92.7399 14.0636C93.1309 14.0636 93.5219 13.9477 93.7565 13.4068L94.2647 12.2091L90.785 3.51587H93.0918L95.3986 9.8136L97.5881 3.51587H99.7384L95.9068 13.7159Z" fill="#3DAE2B"/>
        <path d="M4.53549 10.5091C3.47985 10.5091 2.6979 9.89096 2.6197 8.77051V6.99324H3.75354H4.34C5.43474 6.99324 6.41218 7.53415 6.41218 8.77051C6.41218 9.85233 5.59113 10.5091 4.53549 10.5091ZM4.53549 2.04778C5.47384 2.04778 6.1385 2.74324 6.1385 3.59324C6.1385 4.67506 5.47384 5.17733 4.3009 5.17733H3.79263H2.5806V2.08642L4.53549 2.04778ZM6.64677 6.02733C7.70241 5.64096 8.36707 4.55915 8.36707 3.51596C8.36707 1.50687 6.72497 0.193237 4.57459 0.193237H0.547522V8.77051C0.586619 10.9341 2.34602 12.3637 4.53549 12.3637C6.76406 12.3637 8.56256 11.1273 8.56256 8.80915C8.56256 7.57278 7.8588 6.37506 6.64677 6.02733Z" fill="#1F3045"/>
        <path d="M102.202 4.21139C102.162 4.17275 102.084 4.17275 102.006 4.17275H101.928V4.55912H102.084C102.162 4.55912 102.241 4.55912 102.28 4.52048C102.319 4.48184 102.358 4.44321 102.358 4.36593C102.358 4.28866 102.28 4.21139 102.202 4.21139ZM101.537 5.29321V3.94093C101.615 3.94093 101.732 3.94093 101.928 3.94093C102.084 3.94093 102.202 3.94093 102.202 3.94093C102.319 3.94093 102.397 3.97957 102.475 4.01821C102.592 4.09548 102.671 4.21139 102.671 4.3273C102.671 4.44321 102.632 4.52048 102.592 4.55912C102.514 4.59775 102.436 4.63639 102.358 4.63639C102.436 4.63639 102.514 4.67502 102.553 4.71366C102.632 4.79093 102.671 4.86821 102.671 5.02275V5.13866V5.1773V5.21593V5.25457H102.319C102.319 5.21593 102.319 5.13866 102.28 5.06139C102.28 4.98412 102.28 4.90684 102.241 4.90684C102.241 4.86821 102.202 4.82957 102.123 4.79093C102.084 4.79093 102.045 4.7523 102.006 4.7523H101.928H101.85V5.21593H101.537V5.29321ZM101.38 3.9023C101.185 4.09548 101.068 4.3273 101.068 4.59775C101.068 4.86821 101.185 5.13866 101.38 5.33184C101.576 5.52502 101.811 5.64093 102.084 5.64093C102.358 5.64093 102.592 5.52502 102.788 5.33184C102.983 5.13866 103.101 4.90684 103.101 4.59775C103.101 4.3273 102.983 4.09548 102.788 3.9023C102.592 3.70912 102.358 3.59321 102.084 3.59321C101.811 3.59321 101.576 3.70912 101.38 3.9023ZM102.944 5.48639C102.71 5.71821 102.397 5.83412 102.084 5.83412C101.732 5.83412 101.459 5.71821 101.224 5.48639C100.989 5.25457 100.872 4.94548 100.872 4.63639C100.872 4.28866 100.989 3.97957 101.263 3.74775C101.498 3.51593 101.771 3.40002 102.123 3.40002C102.475 3.40002 102.749 3.51593 102.983 3.74775C103.218 3.97957 103.335 4.28866 103.335 4.59775C103.335 4.94548 103.218 5.25457 102.944 5.48639Z" fill="#3DAE2B"/>
      </g>
      <defs>
        <clipPath id="clip0_5082_23">
          <rect width="104" height="17" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

export function LoginForm({ onToggleMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      // Login successful - AuthContext handles redirect
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex gap-4 p-4">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px] space-y-16">
            {/* Header Section */}
            <div className="space-y-4">
              {/* Logo */}
              <SmallLogo />
              
              {/* Title */}
              <h1 className="font-poppins font-medium text-[32px] text-[#0c2340] leading-[1.06]">
                Get Started
              </h1>
              
              {/* Subtitle */}
              <p className="font-poppins text-[14px] text-[#0c2340] leading-[1.25]">
                Welcome to Bloom Energy Contract Rules generator!
              </p>
              
              {/* Divider Line */}
              <div className="w-full h-px relative">
                <img alt="" className="w-full h-full object-contain" src={imgLine33} />
              </div>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-poppins">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="relative">
                <div className="bg-neutral-100 border border-[#272b30] rounded-lg px-3 py-2 h-10 flex items-center">
                  <input
                    type="email"
                    placeholder="Email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 bg-transparent font-poppins text-[12px] text-[#272b30] placeholder-[#868f9b] border-none outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="bg-neutral-100 border border-[#272b30] rounded-lg px-3 py-2 h-10 flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent font-poppins text-[12px] text-[#272b30] placeholder-[#868f9b] border-none outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 p-0.5"
                  >
                    <EyeOff />
                  </button>
                </div>
              </div>

              {/* Request Credentials Link */}
              <div className="text-left">
                <p className="font-poppins text-[12px] leading-none">
                  <a 
                    href="https://forms.monday.com/forms/a0ffe5eb895db50d53097a31ae8c697e?r=use1"
                    className="font-poppins font-semibold text-[#3dae2b] underline decoration-solid"
                  >
                    Click here
                  </a>
                  {' '}
                  <span className="font-poppins text-[#1f3045]">
                    to request login credentials
                  </span>
                </p>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3dae2b] rounded-md px-3.5 py-2.5 flex items-center justify-center disabled:opacity-50"
              >
                <div className="font-poppins font-medium text-[14px] text-white leading-[1.2]">
                  {loading ? 'Signing in...' : 'Sign In'}
                </div>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-2.5">
          <div className="flex items-center gap-2">
            <FooterLogo />
            <p className="font-poppins font-medium text-[12px] text-[#757d83] leading-[1.5]">
              Copyright © 2025 All rights reserved.
            </p>
          </div>
          <div>
            <p className="font-poppins text-[12px] text-[#b3b7ba] leading-[1.5]">
              Contact Support
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Purple Gradient with Background */}
      <div 
        className="flex-1 bg-black rounded-2xl flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Black overlay with 30% opacity */}
        <div className="absolute inset-0 bg-black opacity-30 rounded-2xl"></div>
        
        {/* Purple gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 opacity-60 rounded-2xl mix-blend-multiply"></div>
        
        <div className="text-center max-w-[694px] relative z-10">
          <h2 className="font-playfair font-medium italic text-white text-[64px] leading-[1.2]">
            AI Contract Rules Generator
          </h2>
        </div>
      </div>
    </div>
  );
}