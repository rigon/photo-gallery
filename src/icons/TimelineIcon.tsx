import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * Source: https://icons-for-free.com/download-icon-timeline-131964753327864360_0.svg
 * @param {*} props 
 * @returns 
 */
// export default function TimelineIcon(props: SvgIconProps) {
//     return (
//         <SvgIcon {...props} viewBox="0 0 24 24">
//             <svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48">
//                 <path fill="#3F51B5" d="M42,29H20.8c-0.5,0-1-0.2-1.4-0.6l-3.7-3.7c-0.4-0.4-0.4-1,0-1.4l3.7-3.7c0.4-0.4,0.9-0.6,1.4-0.6H42 c0.6,0,1,0.4,1,1v8C43,28.6,42.6,29,42,29z"/>
//                 <rect x="9" y="6" fill="#CFD8DC" width="2" height="36"/>
//                 <g fill="#90A4AE">
//                     <circle cx="10" cy="10" r="3"/>
//                     <circle cx="10" cy="24" r="3"/>
//                     <circle cx="10" cy="38" r="3"/>
//                 </g>
//                 <path fill="#448AFF" d="M34,43H20.8c-0.5,0-1-0.2-1.4-0.6l-3.7-3.7c-0.4-0.4-0.4-1,0-1.4l3.7-3.7c0.4-0.4,0.9-0.6,1.4-0.6H34 c0.6,0,1,0.4,1,1v8C35,42.6,34.6,43,34,43z"/>
//                 <path fill="#00BCD4" d="M35,15H20.8c-0.5,0-1-0.2-1.4-0.6l-3.7-3.7c-0.4-0.4-0.4-1,0-1.4l3.7-3.7C19.8,5.2,20.3,5,20.8,5H35 c0.6,0,1,0.4,1,1v8C36,14.6,35.6,15,35,15z"/>
//             </svg>
//         </SvgIcon>
//     );
// }


export default function TimelineIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            <svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48">
                <path d="M42,29H20.8c-0.5,0-1-0.2-1.4-0.6l-3.7-3.7c-0.4-0.4-0.4-1,0-1.4l3.7-3.7c0.4-0.4,0.9-0.6,1.4-0.6H42 c0.6,0,1,0.4,1,1v8C43,28.6,42.6,29,42,29z"/>
                <rect x="9" y="6" width="2" height="36"/>
                <g>
                    <circle cx="10" cy="10" r="3"/>
                    <circle cx="10" cy="24" r="3"/>
                    <circle cx="10" cy="38" r="3"/>
                </g>
                <path d="M34,43H20.8c-0.5,0-1-0.2-1.4-0.6l-3.7-3.7c-0.4-0.4-0.4-1,0-1.4l3.7-3.7c0.4-0.4,0.9-0.6,1.4-0.6H34 c0.6,0,1,0.4,1,1v8C35,42.6,34.6,43,34,43z"/>
                <path d="M35,15H20.8c-0.5,0-1-0.2-1.4-0.6l-3.7-3.7c-0.4-0.4-0.4-1,0-1.4l3.7-3.7C19.8,5.2,20.3,5,20.8,5H35 c0.6,0,1,0.4,1,1v8C36,14.6,35.6,15,35,15z"/>
            </svg>
        </SvgIcon>
    );
}
