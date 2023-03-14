import { FC, } from 'react';
import { useParams } from 'react-router-dom';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CloudIcon from '@mui/icons-material/Cloud';
import LinearProgress from '@mui/material/LinearProgress';

import { CollectionStorageType } from './types';
import { useGetCollectionsQuery } from "./services/api";

const Storage: FC = () => {
    const { collection } = useParams();
    const { data: collections = [] } = useGetCollectionsQuery();

    const st: CollectionStorageType =
        collections.find(c => c.name === collection)?.storage ||
        {size: "N/A", free: "N/A", percentage: 100};
    
    return (
        <Card>
          <CardHeader
            avatar={<CloudIcon />}
            // action={
            //   <IconButton aria-label="settings">
            //     <SettingsIcon />
            //   </IconButton>
            // }
            title={`Storage (${st.free} of ${st.size})`}
            subheader={
              <LinearProgress variant="determinate" value={st.percentage} />
            }
          />
        </Card>
    );
}

export default Storage;
