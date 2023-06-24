import { FC, } from 'react';
import { useParams } from 'react-router-dom';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CloudIcon from '@mui/icons-material/Cloud';
import InfoIcon from '@mui/icons-material/Info';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { CollectionStorageType } from './types';
import { useGetCollectionsQuery } from "./services/api";

const Storage: FC = () => {
    const { collection } = useParams();
    const { data: collections = [] } = useGetCollectionsQuery();

    const st: CollectionStorageType =
        collections.find(c => c.name === collection)?.storage ||
        {size: "N/A", free: "N/A", used: "N/A", percentage: 100};
    
    return (
        <Card square>
          <CardHeader
            avatar={<CloudIcon />}
            // action={
            //   <IconButton aria-label="settings">
            //     <SettingsIcon />
            //   </IconButton>
            // }
            title={<>
              Storage ({st.free} free)
              <Tooltip title={<Typography variant='body2'>Size: {st.size}<br />Used: {st.used}<br />Free: {st.free}</Typography>} arrow placement="top">
                <InfoIcon sx={{ fontSize: 15 }}/>
              </Tooltip></>}
            subheader={
              <LinearProgress variant="determinate" value={st.percentage} />
            }
          />
        </Card>
    );
}

export default Storage;
