// components/icons.tsx
import React from 'react';

const Icon: React.FC<React.SVGProps<SVGSVGElement> & { children: React.ReactNode }> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        {props.children}
    </svg>
);

// General & Actions
export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>);
export const PlusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></Icon>);
export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></Icon>);
export const ArrowTopRightOnSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /><path d="m21 3-9 9" /><path d="M15 3h6v6" /></Icon>);
export const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></Icon>);
export const PowerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.77.04" /></Icon>);
export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>);
export const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>);
export const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icon>);

// Form Fields
export const TypeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M14 4h4v4" /><path d="M18 4 7.5 14.5" /><path d="M3 21v-4h4" /><path d="M3 17l10.5-10.5" /></Icon>);
export const FileTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></Icon>);
export const UserRoundIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><circle cx="12" cy="8" r="4" /><path d="M6 20.5a6 6 0 0 1 12 0" /></Icon>);
export const TagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M12.586 2.586a2 2 0 0 0-2.828 0L2.172 10.172a2 2 0 0 0 0 2.828l7.414 7.414a2 2 0 0 0 2.828 0l7.414-7.414a2 2 0 0 0 0-2.828Z" /><circle cx="16" cy="8" r="1" /></Icon>);
export const BoxesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 9 8.7 5 8.7-5" /><path d="M12 22V12" /></Icon>);
export const FlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></Icon>);
export const TimerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="12" y1="14" y2="18" /><path d="M19 14a7 7 0 1 1-14 0" /></Icon>);
export const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></Icon>);
export const MilestoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" /><path d="M12 13v8" /><path d="M12 3v3" /></Icon>);
export const MountainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></Icon>);
export const CalendarClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h5" /><path d="M17.5 17.5 16 16.25V14" /><circle cx="16" cy="16" r="6" /></Icon>);
export const PaperclipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48" /></Icon>);
export const GitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><line x1="6" x2="6" y1="3" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></Icon>);
export const CheckSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="m9 12 2 2 4-4" /></Icon>);
export const FolderCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2.5" /><circle cx="18" cy="15" r="3" /><path d="M20.5 17.5.5.5-2.5 2.5" /><path d="M18 12v1" /><path d="m19.93 13.07.7.7" /><path d="M21 15h-1" /><path d="m19.93 16.93-.7.7" /><path d="M18 18v-1" /><path d="m16.07 16.93-.7-.7" /><path d="M15 15h1" /><path d="m16.07 13.07.7-.7" /></Icon>);
export const BookmarkPlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /><line x1="12" x2="12" y1="7" y2="13" /><line x1="9" x2="15" y1="10" y2="10" /></Icon>);


// Navigation
export const LayoutKanbanIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect width="7" height="18" x="3" y="3" rx="1" /><rect width="7" height="12" x="14" y="3" rx="1" /></Icon>);
export const BarChart3Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></Icon>);
export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>);
export const UsersRoundIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M18 21a8 8 0 0 0-16 0" /><circle cx="10" cy="8" r="4" /><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-10 0c-2 1.5-4 4.63-4 8" /></Icon>);
export const BookmarkCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /><path d="m9 10 2 2 4-4" /></Icon>);
export const CalendarRangeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M17 14h-6" /><path d="M13 18H7" /><path d="M7 14h.01" /><path d="M17 18h.01" /></Icon>);
export const RepeatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></Icon>);


// Item Types
export const BookOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Icon>);
export const ClipboardCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></Icon>);
export const BugIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M20 9.5 12 17l-8-7.5" /><path d="m2 14 6 6" /><path d="m22 14-6 6" /><path d="M12 20v-8" /><path d="M6.5 9C5 9 4 8 4 6.5S5 4 6.5 4h11C19 4 20 5 20 6.5s-1 2.5-2.5 2.5" /><path d="M3 10h18" /></Icon>);
export const AlarmClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M5 3 2 6" /><path d="m22 6-3-3" /><path d="M6.38 18.7 4 21" /><path d="M17.64 18.67 20 21" /></Icon>);

// Misc
export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></Icon>);
export const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
);
export const ScrumOwlLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 100 100" {...props}><circle cx="50" cy="50" r="45" fill="#486966"/><circle cx="50" cy="50" r="35" fill="#F0F4F4"/><circle cx="40" cy="45" r="10" fill="white"/><circle cx="60" cy="45" r="10" fill="white"/><circle cx="40" cy="45" r="5" fill="black"/><circle cx="60" cy="45" r="5" fill="black"/><path d="M 50 60 Q 50 70 55 65 L 45 65 Q 50 70 50 60" fill="#BD2A2E"/></svg>
);

// US-38: New icons for Manage Views modal
export const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" /></Icon>);
export const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></Icon>);
export const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></Icon>);
export const DocumentDuplicateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></Icon>);
export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>);
export const LockClosedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>);


// Deprecated text icons for tiptap toolbar
export const BoldIcon: React.FC<{className?: string}> = ({className}) => (<strong className={className}>B</strong>)
export const ItalicIcon: React.FC<{className?: string}> = ({className}) => (<em className={className}>I</em>)
export const LinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" /></Icon>);
export const CodeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Icon>);
export const BulletListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></Icon>);
export const NumberedListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><line x1="10" x2="21" y1="6" y2="6" /><line x1="10" x2="21" y1="12" y2="12" /><line x1="10" x2="21" y1="18" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></Icon>);
export const Heading3Icon: React.FC<{className?: string}> = ({className}) => (<h3 className={className}>H3</h3>)
export const Heading4Icon: React.FC<{className?: string}> = ({className}) => (<h4 className={className}>H4</h4>)
export const Heading5Icon: React.FC<{className?: string}> = ({className}) => (<h5 className={className}>H5</h5>)
export const Heading6Icon: React.FC<{className?: string}> = ({className}) => (<h6 className={className}>H6</h6>)
export const ColorSwatchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" /></Icon>);
export const HighlightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="m16 5-4 4" /><path d="M13 8 8 3" /><path d="M7 13 2 8" /><path d="M22 19 17 14" /><path d="m15 21 5-5" /><path d="m5 21 5-5" /><path d="M12 22v-2.5" /><path d="M12 4V2" /><path d="M22 12h-2" /><path d="M4 12H2" /></Icon>);
export const CodeBlockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<Icon {...props}><path d="M10 18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2Z" /><path d="M14 14a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2Z" /><path d="M6 10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2Z" /><path d="M18 10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2Z" /></Icon>);