import { Navigate, useRoutes } from 'react-router-dom';
// layouts
import Layout from './Layout';

// ----------------------------------------------------------------------

export default function Router() {
  return useRoutes([
    { path: '*', element: <Layout /> }
  ]);
}
