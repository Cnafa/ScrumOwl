// components/icons.tsx
import React from 'react';

const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {props.children}
    </svg>
);

export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></Icon>
);

export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></Icon>
);

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.57-1.031 1.6-1.554 2.6-1.554s2.03.523 2.6 1.554m-8.388-2.872a9.094 9.094 0 013.741-.479 3 3 0 014.682-2.72m-7.5-2.962c.57-1.031 1.6-1.554 2.6-1.554s2.03.523 2.6 1.554M3 18.72v-2.172c0-.956.39-1.843 1.053-2.482 1.353-1.284 3.06-1.284 4.414 0 .663.639 1.053 1.526 1.053 2.482v2.172M3 18.72a9.094 9.094 0 003.741-4.79 3 3 0 00-4.682-2.72m0 0a9.094 9.094 0 013.741-4.79 3 3 0 014.682-2.72M3 18.72c.57 1.031 1.6 1.554 2.6 1.554s2.03-.523 2.6-1.554m-8.388-2.872a9.094 9.094 0 013.741-4.79 3 3 0 014.682-2.72" />
  </Icon>
);

export const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></Icon>
);

export const ChatBubbleLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></Icon>
);

export const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
);

export const ScrumOwlLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 100 100" {...props}><circle cx="50" cy="50" r="45" fill="#486966"/><circle cx="50" cy="50" r="35" fill="#F0F4F4"/><circle cx="40" cy="45" r="10" fill="white"/><circle cx="60" cy="45" r="10" fill="white"/><circle cx="40" cy="45" r="5" fill="black"/><circle cx="60" cy="45" r="5" fill="black"/><path d="M 50 60 Q 50 70 55 65 L 45 65 Q 50 70 50 60" fill="#BD2A2E"/></svg>
);

export const PlusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></Icon>
);

export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></Icon>
);

export const BoldIcon: React.FC<{className?: string}> = ({className}) => (<strong className={className}>B</strong>)
export const ItalicIcon: React.FC<{className?: string}> = ({className}) => (<em className={className}>I</em>)
export const LinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></Icon>);
export const CodeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25" /></Icon>);
export const BulletListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></Icon>);
export const NumberedListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></Icon>);
export const Heading3Icon: React.FC<{className?: string}> = ({className}) => (<h3 className={className}>H3</h3>)
export const Heading4Icon: React.FC<{className?: string}> = ({className}) => (<h4 className={className}>H4</h4>)
export const Heading5Icon: React.FC<{className?: string}> = ({className}) => (<h5 className={className}>H5</h5>)
export const Heading6Icon: React.FC<{className?: string}> = ({className}) => (<h6 className={className}>H6</h6>)
export const ColorSwatchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.5A2.25 2.25 0 015.25 2.25h13.5A2.25 2.25 0 0121 4.5v12.75c0 2.07-1.68 3.75-3.75 3.75h-1.018a1.5 1.5 0 01-1.442-.962l-1.34-4.02a1.5 1.5 0 00-1.442-.962h-3.414a1.5 1.5 0 00-1.442.962l-1.34 4.02a1.5 1.5 0 01-1.442.962H6.75z" /></Icon>);
export const HighlightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></Icon>);
export const CodeBlockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></Icon>);
