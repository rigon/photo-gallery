import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';

import {
  IconChevronLeft,
  IconChevronRight,
  IconHeartFilled,
  IconArrowsDiff,
  IconBookUpload,
  IconCaretDownFilled,
  IconZoomIn,
  IconZoomOut,
  IconDotsVertical,
  IconPlus,
  IconEdit,
  IconInfoCircle,
  IconPhotoUp,
  IconTrash,
} from '@tabler/icons-react';

import { Dropdown, ButtonGroup, MenuButton, Menu, MenuItem, ListItemDecorator, Divider, ListDivider } from '@mui/joy';
import { useEffect, useState } from 'react';
import { toggleSidebar } from '../utils';
import { IconMenu2 } from '@tabler/icons-react';

export default function Toolbar() {
  const [showTitle, setShowTitle] = useState(true);
  
  useEffect(() => {
    const handleScroll = (_: any) => setShowTitle(window.scrollY > 110);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  return (
    <Box
      component="header"
      className="Header"
      sx={[
        {
          p: 2,
          // pb: 4,

          // backdropFilter: "saturate(200%) blur(6px)",
          // backdropFilter: "blur(6px)",
          // backgroundColor: "transparent",
          // backgroundColor: "background.body",
          // boxShadow: "rgba(255, 255, 255, 0.9) 0rem 0rem 0.0625rem 0.0625rem inset, rgba(0, 0, 0, 0.05) 0rem 1.25rem 1.6875rem 0rem",
          // boxShadow: "0 3px 5px var(--joy-palette-background-body)",
          // backgroundColor: "rgba(0, 0, 0, 0.8)",
          // background: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.037) 82.85%, rgba(0,0,0,0.019) 88%, rgba(0,0,0,0) 100%)",
          //background: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.4))",

          backdropFilter: "blur(6px)",
          backgroundColor: "rgb(from var(--joy-palette-background-body) r g b / 0.8)",
          boxShadow: "0 0 2em var(--joy-palette-background-body)",
          borderBottom: "1px solid rgba(from var(--joy-palette-background-body) r g b / 0.2)",
          
          // borderBottom: '1px solid',
          // borderColor: 'background.level2',
          // boxShadow: 'sm',

          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          // gridColumn: '1 / -1',
          // borderBottom: '1px solid',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        },
      ]}>
    {/* <Sheet
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'fixed',
      top: 0,
      width: '100vw',
      height: 'var(--Header-height)',
      zIndex: 9995,
      p: 2,
      gap: 1,
      borderBottom: '1px solid',
      borderColor: 'background.level1',
      boxShadow: 'sm',
    }}
  > */}
      <Stack
        direction="row"
        spacing={0}
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          display: { xs: 'none', sm: 'flex' },
        }}
      >
        <IconButton
          sx={{ display: { sm: 'flex', md: 'none' }, mr: 1 }}
          onClick={() => toggleSidebar()}
          variant="outlined"
          color="neutral"
          size="sm"
        >
          <IconMenu2 />
        </IconButton>
        <IconButton size="sm" variant="plain" color="neutral">
          <IconChevronLeft />
        </IconButton>
        <IconButton size="sm" variant="plain" color="neutral">
          <IconChevronRight />
        </IconButton>
        { showTitle &&
          <Typography level="h4" noWrap sx={{mx: 1}}>
            2024-06-30 Viagem ao Fim do Mundo
          </Typography>
        }
      </Stack>
      <Stack spacing={1} direction="row" sx={{ alignItems: 'top' }}>
        <Dropdown>
          <ButtonGroup size="sm" variant="outlined" color="neutral">
            <Button startDecorator={<IconBookUpload />}>
              Upload
            </Button>
            <MenuButton
              slots={{ root: IconButton }}
            >
              <IconCaretDownFilled />
            </MenuButton>
          </ButtonGroup>
          <Menu placement='bottom-start'>
            <MenuItem>
              <ListItemDecorator>
                <IconPhotoUp />
              </ListItemDecorator>
              Add photos
            </MenuItem>
            <Divider />
            <MenuItem>
              <Stack direction="column">
                <p><em>No items for uploading</em></p>
                <p><em>Use the button above &uarr; to add more photos <br /><b>Or</b><br />Drag and drop files here!</em></p>
              </Stack>
            </MenuItem>
          </Menu>
        </Dropdown>

        {/* <Button
          startDecorator={<IconBookUpload />}
          endDecorator={<IconCaretDownFilled />}
          color="neutral"
          variant="plain"
          size="sm"
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
        >
          Upload
        </Button> */}
        {/* <IconButton size="sm" variant="plain" color="neutral">
          <IconPhotoPlus />
        </IconButton> */}
        <Select defaultValue="1" size="sm" variant="plain" startDecorator={<IconHeartFilled />}>
          <MenuItem>
            <ListItemDecorator>
              <IconPlus />
            </ListItemDecorator>{' '}
            Create new...
          </MenuItem>
          <ListDivider />
          <Option value="1" label="Favorites">
            Favorites <Typography level="body-sm">Photos</Typography>
          </Option>
          <Option value="2" label="Besties">
            Besties <Typography level="body-sm">Photos</Typography>
          </Option>
          <Option value="3" label="Good looking">
            Good looking <Typography level="body-sm">Photos</Typography>
          </Option>
          <Option value="4" label="Best of">
            Best of <Typography level="body-sm">Photos</Typography>
          </Option>
        </Select>
        <IconButton size="sm" variant="plain" color="neutral">
          <IconZoomIn />
        </IconButton>
        <IconButton size="sm" variant="plain" color="neutral">
          <IconZoomOut />
        </IconButton>
        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{ root: { size: 'sm', variant: 'plain', color: 'neutral' } }}
          >
            <IconDotsVertical />
          </MenuButton>
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
            <MenuItem>
              <ListItemDecorator>
                <IconArrowsDiff />
              </ListItemDecorator>
              Find duplicates
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
    </Box>
  );
}
