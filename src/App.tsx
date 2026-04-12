import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';
import Sidebar from './components/Sidebar';
import Main from './components/Main';
import Toolbar from './components/Toolbar';

import theme from './theme';

import PhotoAlbum from 'react-photo-album';
import { album, photos } from './data';
import { Typography, Chip, ListItemContent, ListItemButton, Sheet } from '@mui/joy';
import { IconCheck, IconChevronDown, IconLibraryPhoto } from '@tabler/icons-react';
import Toggler from './components/Toggler';

export default function JoyMessagesTemplate() {
  return (
    <CssVarsProvider disableTransitionOnChange theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
        {/* <Header /> */}
        <Sidebar />
        <Box
          component="main"
          className="MainContent"
          sx={{
            // gap: 4,
            // px: { xs: 2, md: 6 },
            // pt: {
            //   xs: 'calc(12px + var(--Header-height))',
            //   sm: 'calc(12px + var(--Header-height))',
            //   md: 1,
            // },
            // pb: { xs: 2, sm: 2, md: 3 },
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            height: '100dvh',
            overflowY: 'scroll',
          }}
        >
          <Toolbar />
          <Main />

          {/* <AccordionGroup size="lg" variant="soft">
            <Accordion defaultExpanded>
              <AccordionSummary sx={{gap: 1}}>
                  <SvgIcon sx={{ml: 1 }} color="inherit"><IconLibraryPhoto /></SvgIcon>
                  <ListItemContent>
                    <Typography level="title-md">Sub-Albums</Typography>
                  </ListItemContent>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  role="group"
                  aria-labelledby="fav-movie"
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 1, py: 1 }}
                >
                  {album.subalbums.map((subalbum) => {
                    return (
                      <Chip
                        variant="solid"
                        // color='neutral'
                        // startDecorator={<IconCheck size={16} />}
                      >
                        {subalbum}
                      </Chip>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          </AccordionGroup> */}

          {/* <List size="md">
            <ListItem nested> */}
              <Toggler defaultExpanded renderToggle={({ open, setOpen }) => (
                  <ListItemButton variant='soft' onClick={() => setOpen(!open)} sx={{ py: 1, px: { xs: 2, md: 3 }}}>
                    <ListItemContent>
                      <Typography
                        level="title-md"
                        // textTransform="uppercase"
                        fontWeight="lg"
                        startDecorator={<IconLibraryPhoto size={22} />}
                        endDecorator={<IconChevronDown
                          size={16}
                          style={{
                            transform: (open ? 'rotate(180deg)' : 'none')
                          }}
                      />}>
                        Sub-Albums
                      </Typography>
                    </ListItemContent>
                      
                  </ListItemButton>
                )}
              >
                <Box>
                  <Sheet variant="soft" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1, pb: 2, px: { xs: 2, md: 3 }}}>
                    {album.subalbums.map((subalbum) => {
                      const checked = subalbum.length < 5;
                      return (
                        <Chip
                          size="lg"
                          variant="outlined"
                          color={ checked ? 'primary' : 'neutral'}
                          startDecorator={checked && <IconCheck size={16} />}
                          onClick={() => {}}
                        >
                          {subalbum}
                        </Chip>
                      );
                    })}
                  </Sheet>
                </Box>
              </Toggler>
            {/* </ListItem>
          </List> */}

          <PhotoAlbum photos={photos} layout="rows" spacing={1} />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}
