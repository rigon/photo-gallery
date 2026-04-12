import { Card, CardContent, CardCover, Dropdown, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem } from '@mui/joy';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

import {
  IconMapPin,
  IconCalendar,
  IconPhotoCheck,
  IconArrowsDiff,
  IconEdit,
  IconInfoCircle,
  IconTrash,
  IconTools,
  IconAlbum,
  IconExchange,
  IconMovie,
} from '@tabler/icons-react';

import Map from "./Map";

export default function Main() {
  return (

    <Card size="lg" variant='plain' sx={{ borderRadius: 0 }}>
      <CardCover>
        <Map mark={{lat: 10, lng: 10}} />
      </CardCover>
      <CardCover
        sx={{
          background: "linear-gradient(to top, rgb(from var(--joy-palette-background-level1) r g b / 0.7), rgb(from var(--joy-palette-background-level1) r g b / 0.5))",
          //   'linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0) 200px), linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0) 300px)',
        }}
      />
      <CardContent sx={{ justifyContent: 'flex-end' }}>
        <Stack 
          //sx={{ mx: { xs: 2, md: 3 } }}
          spacing={1}>
          <Typography level="h1">
            2024-06-30 Viagem ao Fim do Mundo
          </Typography>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
            spacing={2}
          >
            <Stack direction="column"
              spacing={1}
              sx={{ justifyContent: 'space-between' }}
            >
              <Typography
                startDecorator={<IconCalendar size={20} />}
                level="body-sm"
              >
                {new Date().toDateString()}
              </Typography>
              <Typography
                startDecorator={<IconMapPin size={20} />}
                level="body-sm"
              >
                California, USA
              </Typography>
              <Typography
                startDecorator={<IconPhotoCheck size={20} />}
                level="body-sm"
              >
                20 items
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Dropdown>
                <MenuButton startDecorator={<IconTools />} color="success" variant='soft'>Tools</MenuButton>
                <Menu>
                  <MenuItem>
                    <ListItemDecorator>
                      <IconArrowsDiff />
                    </ListItemDecorator>
                    Find duplicates
                  </MenuItem>
                  <MenuItem>
                    <ListItemDecorator>
                      <IconExchange />
                    </ListItemDecorator>
                    Similar photos
                  </MenuItem>
                  <MenuItem>
                    <ListItemDecorator>
                      <IconMovie />
                    </ListItemDecorator>
                    Presentation video
                  </MenuItem>
                </Menu>
              </Dropdown>
              <Dropdown>
                <MenuButton startDecorator={<IconAlbum />} color="primary" variant='soft'>Actions</MenuButton>
                <Menu placement="bottom-end">
                  <MenuItem>
                    <ListItemDecorator>
                      <IconInfoCircle />
                    </ListItemDecorator>
                    Album info
                  </MenuItem>
                  <MenuItem>
                    <ListItemDecorator>
                      <IconEdit />
                    </ListItemDecorator>
                    Rename album
                  </MenuItem>
                  <ListDivider />
                  <MenuItem color="danger">
                    <ListItemDecorator>
                      <IconTrash />
                    </ListItemDecorator>
                    Delete album
                  </MenuItem>
                </Menu>
              </Dropdown>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
