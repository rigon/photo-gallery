import GlobalStyles from '@mui/joy/GlobalStyles';
import Avatar from '@mui/joy/Avatar';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Divider from '@mui/joy/Divider';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import LinearProgress from '@mui/joy/LinearProgress';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton, { listItemButtonClasses } from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Typography from '@mui/joy/Typography';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';

import {
  IconPhotoFilled,
  IconCompass,
  IconPlus,
  IconSearch,
  IconSortAscendingSmallBig,
  IconCaretDownFilled,
  IconLogout,
  IconChevronDown,
  IconMap2,
  IconFriends,
  IconTimeline,
  IconStarsFilled,
  IconBooks,
} from '@tabler/icons-react';

import ColorSchemeToggle from './ColorSchemeToggle';
import { closeSidebar } from '../utils';
import { albums } from '../data';
import Button from '@mui/joy/Button';
import Toggler from './Toggler';


export default function Sidebar() {
  return (
    <Sheet
      className="Sidebar"
      sx={{
        position: { xs: 'fixed', md: 'sticky' },
        transform: {
          xs: 'translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1)))',
          md: 'none',
        },
        transition: 'transform 0.4s, width 0.4s',
        zIndex: 10000,
        height: '100dvh',
        width: 'var(--Sidebar-width)',
        top: 0,
        p: 2,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <GlobalStyles
        styles={(theme) => ({
          ':root': {
            '--Sidebar-width': '300px',
            [theme.breakpoints.up('lg')]: {
              '--Sidebar-width': '320px',
            },
          },
        })}
      />
      <Box
        className="Sidebar-overlay"
        sx={{
          position: 'fixed',
          zIndex: 9998,
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 'var(--SideNavigation-slideIn)',
          backgroundColor: 'var(--joy-palette-background-backdrop)',
          transition: 'opacity 0.4s',
          transform: {
            xs: 'translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1) + var(--SideNavigation-slideIn, 0) * var(--Sidebar-width, 0px)))',
            lg: 'translateX(-100%)',
          },
        }}
        onClick={() => closeSidebar()}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'top' }}>
        <IconButton variant="plain" color="danger" size="sm">
          <IconPhotoFilled size="52px" />
        </IconButton>
        <Stack direction="column" spacing="3px">
          <Typography
            level="title-sm"
            textTransform="uppercase"
            fontWeight="lg">Photo Gallery</Typography>
          <Select
            color="primary"
            placeholder="Choose one…"
            size="sm"
            variant="plain"
            defaultValue="photos"
            startDecorator={<IconBooks size={20} />}
            indicator={<IconCaretDownFilled size={12} />}
            sx={{
            }}
            slotProps={{
              root: {
                sx: {
                  ml: "-8px !important",
                  py: "3px",
                  minHeight: "1.5em",
                }
              },
              listbox: {
                variant: 'plain',
                size: 'md',
                sx: {
                  zIndex: 10000,
                }
              },
            }}
          >
            <Option value="photos">Photos</Option>
            <Option value="personal">Personal</Option>
            <Option value="work">Work</Option>
            <Option value="travels">Travels</Option>
          </Select>
        </Stack>
        <ColorSchemeToggle sx={{ ml: 'auto' }} />
      </Box>
      <Divider />
      <List
        size="sm"
        sx={{
          gap: 1,
          '--List-nestedInsetStart': '30px',
          '--ListItem-radius': (theme) => theme.vars.radius.sm,
        }}
      >
        <ListItem nested>
          <Toggler defaultExpanded
            renderToggle={({ open, setOpen }) => (
              <ListItemButton onClick={() => setOpen(!open)}>
                <IconCompass />
                <ListItemContent>
                  <Typography level="title-sm">Explore</Typography>
                </ListItemContent>
                <IconChevronDown
                  size={16}
                  style={{
                    transform: (open ? 'rotate(180deg)' : 'none')
                  }}
                />
              </ListItemButton>
            )}
          >
            <List sx={{ gap: 0.5 }}>
              <ListItem>
                <ListItemButton selected sx={{ mt: 0.5 }}>
                  <IconTimeline size={16} />Timeline
                </ListItemButton>
              </ListItem>
              <ListItem>
                <ListItemButton>
                  <IconStarsFilled size={16} />Favorites
                </ListItemButton>
              </ListItem>
              <ListItem>
                <ListItemButton>
                  <IconMap2 size={16} /> Map
                </ListItemButton>
              </ListItem>
              <ListItem>
                <ListItemButton>
                  <IconFriends size={16} /> People
                </ListItemButton>
              </ListItem>
            </List>
          </Toggler>
        </ListItem>
      </List>


      <Stack direction="column" spacing={0.5}>
        <Stack
          direction="row"
          spacing={{ xs: 1, md: 2 }}
          sx={{
            display: 'flex',
            mb: 1,
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'start', sm: 'center' },
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            level="body-xs"
            textTransform="uppercase"
            fontWeight="lg"
          >
            Albums
          </Typography>
          
          <Stack spacing={0} direction="row" sx={{ alignItems: 'center' }}>
            <Button
                startDecorator={<IconPlus size={16} />}
                size='sm'
                variant='plain'
                color='neutral'
              >New</Button>
            {/* <IconButton size="sm" variant="plain" color="neutral">
              <IconPlus size={16} />
            </IconButton> */}
            <IconButton size="sm" variant="plain" color="neutral">
              <IconSortAscendingSmallBig size={16} />
            </IconButton>
          </Stack>
        </Stack>
        <Input size="sm" startDecorator={<IconSearch size={16} />} placeholder="Search" />
      </Stack>
      <Box
        sx={{
          minHeight: 0,
          overflow: 'hidden auto',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          [`& .${listItemButtonClasses.root}`]: {
            gap: 1.5,
          },
        }}
      >
        <List
          size="md"
          sx={{
            '--List-nestedInsetStart': '30px',
            '--ListItem-radius': (theme) => theme.vars.radius.sm,
          }}
        >
          {/* <ListItem>
            <ListItemButton>
              <HomeRoundedIcon />
              <ListItemContent>
                <Typography level="title-sm">Home</Typography>
              </ListItemContent>
            </ListItemButton>
          </ListItem>
          <ListItem>
            <ListItemButton>
              <DashboardRoundedIcon />
              <ListItemContent>
                <Typography level="title-sm">Dashboard</Typography>
              </ListItemContent>
            </ListItemButton>
          </ListItem>
          <ListItem>
            <ListItemButton
              role="menuitem"
              component="a"
              href="/joy-ui/getting-started/templates/order-dashboard/"
            >
              <ShoppingCartRoundedIcon />
              <ListItemContent>
                <Typography level="title-sm">Orders</Typography>
              </ListItemContent>
            </ListItemButton>
          </ListItem>
          <ListItem>
            <ListItemButton selected>
              <QuestionAnswerRoundedIcon />
              <ListItemContent>
                <Typography level="title-sm">Messages</Typography>
              </ListItemContent>
              <Chip size="sm" color="primary" variant="solid">
                4
              </Chip>
            </ListItemButton>
          </ListItem>
          <ListItem nested>
            <Toggler
              renderToggle={({ open, setOpen }) => (
                <ListItemButton onClick={() => setOpen(!open)}>
                  <GroupRoundedIcon />
                  <ListItemContent>
                    <Typography level="title-sm">Users</Typography>
                  </ListItemContent>
                  <KeyboardArrowDownIcon
                    sx={[
                      open
                        ? {
                            transform: 'rotate(180deg)',
                          }
                        : {
                            transform: 'none',
                          },
                    ]}
                  />
                </ListItemButton>
              )}
            >
              <List sx={{ gap: 0.5 }}>
                <ListItem sx={{ mt: 0.5 }}>
                  <ListItemButton
                    role="menuitem"
                    component="a"
                    href="/joy-ui/getting-started/templates/profile-dashboard/"
                  >
                    My profile
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton>Create a new user</ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton>Roles & permission</ListItemButton>
                </ListItem>
              </List>
            </Toggler>
          </ListItem> */}

          {albums.map((album) => (
            <ListItem>
              <ListItemButton>
                <ListItemContent>
                  <Typography level="title-sm" noWrap>{album.name}</Typography>
                </ListItemContent>
              </ListItemButton>
            </ListItem>))}
        </List>
        <List
          size="sm"
          sx={{
            mt: 'auto',
            flexGrow: 0,
            '--ListItem-radius': (theme) => theme.vars.radius.sm,
            '--List-gap': '8px',
            mb: 2,
          }}
        >
        </List>
      </Box>
      <Card
        invertedColors
        variant="soft"
        color="warning"
        size="sm"
        sx={{ boxShadow: 'none' }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography level="title-sm">Used space</Typography>
          {/* <IconButton size="sm">
              <CloseRoundedIcon />
            </IconButton> */}
        </Stack>
        {/* <Typography level="body-xs">
            Your team has used 80% of your available space. Need more?
          </Typography> */}
        <LinearProgress variant="outlined" value={80} determinate sx={{ my: 1 }} />
        {/* <Button size="sm" variant="solid">
            Upgrade plan
          </Button> */}
      </Card>
      <Divider />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Avatar
          variant="outlined"
          size="sm"
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=286"
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography level="title-sm">Siriwat K.</Typography>
          <Typography level="body-xs">siriwatk@test.com</Typography>
        </Box>
        <IconButton size="sm" variant="plain" color="neutral">
          <IconLogout />
        </IconButton>
      </Box>
    </Sheet>
  );
}
