import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MicIcon from '@mui/icons-material/Mic';
import HomeIcon from '@mui/icons-material/Home';

function Navigation() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Your Voice', path: '/your-voice', icon: <MicIcon /> },
  ];

  const desktopMenu = (
    <>
      <Button
        color="inherit"
        component={RouterLink}
        to="/"
        sx={{ mx: 1 }}
      >
        Home
      </Button>
      <Button
        color="inherit"
        component={RouterLink}
        to="/your-voice"
        sx={{ mx: 1 }}
      >
        Your Voice
      </Button>
    </>
  );

  const mobileDrawer = (
    <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
      <List sx={{ width: 250 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.path}
            component={RouterLink}
            to={item.path}
            onClick={toggleDrawer(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              {mobileDrawer}
            </>
          ) : null}
          
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
            }}
          >
            🎤 Voice You
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {desktopMenu}
            </Box>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
}

export default Navigation;
