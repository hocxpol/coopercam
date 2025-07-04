import React, { useState, useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import clsx from "clsx";
import moment from "moment";
import {
	makeStyles,
	Drawer,
	AppBar,
	Toolbar,
	List,
	Typography,
	Divider,
	MenuItem,
	IconButton,
	Menu,
	useTheme,
	useMediaQuery,
	Tooltip,
} from "@material-ui/core";

import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import AccountCircle from "@material-ui/icons/AccountCircle";
import CachedIcon from "@material-ui/icons/Cached";
import SignalCellularConnectedNoInternet0BarIcon from "@material-ui/icons/SignalCellularConnectedNoInternet0Bar";
import PersonIcon from "@material-ui/icons/Person";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import NotificationsVolume from "../components/NotificationsVolume";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import BackdropLoading from "../components/BackdropLoading";
import DarkMode from "../components/DarkMode";
import { i18n } from "../translate/i18n";
import toastError from "../errors/toastError";
import AnnouncementsPopover from "../components/AnnouncementsPopover";

import logo from "../assets/glorium-chat/logo-glorium-chat.webp";
import { SocketContext } from "../context/Socket/SocketContext";
import ChatPopover from "../pages/Chat/ChatPopover";

import { useDate } from "../hooks/useDate";

import ColorModeContext from "../layout/themeContext";
import Brightness4Icon from '@material-ui/icons/Brightness4';
import Brightness7Icon from '@material-ui/icons/Brightness7';

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
	root: {
		display: "flex",
		height: "100vh",
		[theme.breakpoints.down("sm")]: {
			height: "calc(100vh - 56px)",
		},
		backgroundColor: theme.palette.fancyBackground,
		'& .MuiButton-outlinedPrimary': {
			color: theme.mode === 'light' ? '#FFF' : '#FFF',
			//backgroundColor: theme.mode === 'light' ? '#682ee2' : '#682ee2',
			backgroundColor: theme.mode === 'light' ? theme.palette.primary.main : '#1c1c1c',
			//border: theme.mode === 'light' ? '1px solid rgba(0 124 102)' : '1px solid rgba(255, 255, 255, 0.5)',
		},
		'& .MuiTab-textColorPrimary.Mui-selected': {
			color: theme.mode === 'light' ? 'Primary' : '#FFF',
		}
	},
	avatar: {
		width: "100%",
	},
	toolbar: {
		paddingRight: 24, // keep right padding when drawer closed
		color: theme.palette.dark.main,
		background: theme.palette.barraSuperior,
	},
	toolbarIcon: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "0px",
		minHeight: "48px",
		[theme.breakpoints.down("sm")]: {
			height: "48px"
		}
	},
	appBar: {
		zIndex: theme.zIndex.drawer + 1,
		transition: theme.transitions.create(["width", "margin"], {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen,
		}),
	},
	appBarShift: {
		marginLeft: drawerWidth,
		width: `calc(100% - ${drawerWidth}px)`,
		transition: theme.transitions.create(["width", "margin"], {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen,
		}),
		[theme.breakpoints.down("sm")]: {
			display: "none"
		}
	},
	menuButton: {
		marginRight: 36,
	},
	menuButtonHidden: {
		display: "none",
	},
	title: {
		flexGrow: 1,
		fontSize: 14,
		color: "white",
	},
	drawerPaper: {
		position: "relative",
		whiteSpace: "nowrap",
		width: drawerWidth,
		transition: theme.transitions.create("width", {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen,
		}),
		'@media (max-width:400px)': {
			width: "100%"
		},
		...theme.scrollbarStylesSoft
	},
	drawerPaperClose: {
		overflowX: "hidden",
		transition: theme.transitions.create("width", {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen,
		}),
		width: theme.spacing(7),
		[theme.breakpoints.up("sm")]: {
			width: theme.spacing(9),
		},
		'@media (max-width:400px)': {
			width: "100%"
		}
	},
	appBarSpacer: {
		minHeight: "48px",
	},
	content: {
		flex: 1,
		overflow: "auto",

	},
	container: {
		paddingTop: theme.spacing(4),
		paddingBottom: theme.spacing(4),
	},
	paper: {
		padding: theme.spacing(2),
		display: "flex",
		overflow: "auto",
		flexDirection: "column"
	},
	containerWithScroll: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	NotificationsPopOver: {
		// color: theme.barraSuperior.secondary.main,
	},
	logo: {
		width: "100%",
		height: "auto",
		maxWidth: 250,
		[theme.breakpoints.down("sm")]: {
			width: "auto",
			height: "100%",
			maxWidth: 200,
		},
		logo: theme.logo
	},
}));

const getDateAndDifDays = (date) => {
	const now = moment();
	const dueDate = moment(date);
	const diff = dueDate.diff(now, "days");
	return { difData: diff };
};

const LoggedInLayout = ({ children, themeToggle }) => {
	const classes = useStyles();
	const history = useHistory();
	const [userModalOpen, setUserModalOpen] = useState(false);
	const [anchorEl, setAnchorEl] = useState(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const { handleLogout, loading } = useContext(AuthContext);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const theme = useTheme();
	const isMobile = useMediaQuery('(max-width:400px)');
	const [drawerVariant, setDrawerVariant] = useState(isMobile ? "temporary" : "permanent");
	const [currentTime, setCurrentTime] = useState(new Date());
	// const [dueDate, setDueDate] = useState("");
	const { user } = useContext(AuthContext);

	const { colorMode } = useContext(ColorModeContext);
	const greaterThenSm = useMediaQuery(theme.breakpoints.up("sm"));

	const [volume, setVolume] = useState(localStorage.getItem("volume") || 1);

	const { dateToClient } = useDate();

	const [connectionWarning, setConnectionWarning] = useState(false);
	const { whatsApps } = useContext(WhatsAppsContext);

	//################### CODIGOS DE TESTE #########################################
	// useEffect(() => {
	//   navigator.getBattery().then((battery) => {
	//     console.log(`Battery Charging: ${battery.charging}`);
	//     console.log(`Battery Level: ${battery.level * 100}%`);
	//     console.log(`Charging Time: ${battery.chargingTime}`);
	//     console.log(`Discharging Time: ${battery.dischargingTime}`);
	//   })
	// }, []);

	// useEffect(() => {
	//   const geoLocation = navigator.geolocation

	//   geoLocation.getCurrentPosition((position) => {
	//     let lat = position.coords.latitude;
	//     let long = position.coords.longitude;

	//     console.log('latitude: ', lat)
	//     console.log('longitude: ', long)
	//   })
	// }, []);

	// useEffect(() => {
	//   const nucleos = window.navigator.hardwareConcurrency;

	//   console.log('Nucleos: ', nucleos)
	// }, []);

	// useEffect(() => {
	//   console.log('userAgent', navigator.userAgent)
	//   if (
	//     navigator.userAgent.match(/Android/i)
	//     || navigator.userAgent.match(/webOS/i)
	//     || navigator.userAgent.match(/iPhone/i)
	//     || navigator.userAgent.match(/iPad/i)
	//     || navigator.userAgent.match(/iPod/i)
	//     || navigator.userAgent.match(/BlackBerry/i)
	//     || navigator.userAgent.match(/Windows Phone/i)
	//   ) {
	//     console.log('é mobile ', true) //celular
	//   }
	//   else {
	//     console.log('não é mobile: ', false) //nao é celular
	//   }
	// }, []);
	//##############################################################################

	const socketManager = useContext(SocketContext);

	useEffect(() => {
		if (document.body.offsetWidth > 1200) {
			setDrawerOpen(true);
		}
	}, []);

	useEffect(() => {
		if (document.body.offsetWidth < 600) {
			setDrawerVariant("temporary");
		} else {
			setDrawerVariant("permanent");
		}
	}, [drawerOpen]);

	useEffect(() => {
		const companyId = localStorage.getItem("companyId");
		const userId = localStorage.getItem("userId");

		const socket = socketManager.getSocket(companyId);

		socket.on(`company-${companyId}-auth`, (data) => {
			if (data.user.id === +userId) {
				toastError("Sua conta foi acessada em outro computador.");
				setTimeout(() => {
					localStorage.clear();
					window.location.reload();
				}, 1000);
			}
		});

		socket.emit("userStatus");
		const interval = setInterval(() => {
			socket.emit("userStatus");
		}, 1000 * 60 * 10);

		return () => {
			socket.disconnect();
			clearInterval(interval);
		};
	}, [socketManager]);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			if (whatsApps?.length > 0) {
				const offlineWhats = whatsApps.filter((whats) => {
					return (
						whats.status === "qrcode" ||
						whats.status === "PAIRING" ||
						whats.status === "DISCONNECTED" ||
						whats.status === "TIMEOUT" ||
						whats.status === "OPENING"
					);
				});
				if (offlineWhats.length > 0) {
					setConnectionWarning(true);
				} else {
					setConnectionWarning(false);
				}
			}
		}, 2000);
		return () => clearTimeout(delayDebounceFn);
	}, [whatsApps]);

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const handleMenu = (event) => {
		setAnchorEl(event.currentTarget);
		setMenuOpen(true);
	};

	const handleCloseMenu = () => {
		setAnchorEl(null);
		setMenuOpen(false);
	};

	const handleOpenUserModal = () => {
		setUserModalOpen(true);
		handleCloseMenu();
	};

	const handleClickLogout = () => {
		handleCloseMenu();
		handleLogout();
	};

	const drawerClose = () => {
		if (document.body.offsetWidth < 600) {
			setDrawerOpen(false);
		}
	};

	const handleRefreshPage = () => {
		window.location.reload(false);
	}

	const handleMenuItemClick = () => {
		if (isMobile) {
			setDrawerOpen(false);
		}
	};

	if (loading) {
		return <BackdropLoading />;
	}

	return (
		<div className={classes.root}>
			<Drawer
				variant={drawerVariant}
				className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
				classes={{
					paper: clsx(
						classes.drawerPaper,
						!drawerOpen && classes.drawerPaperClose
					),
				}}
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
			>
				<div className={classes.toolbarIcon}>
					<div onClick={() => history.push("/")} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
						<img src={logo} className={classes.logo} alt="logo" />
					</div>
					<IconButton onClick={() => setDrawerOpen(!drawerOpen)}>
						<ChevronLeftIcon />
					</IconButton>
				</div>
				<Divider />
				<List className={classes.containerWithScroll}>
					<MainListItems drawerClose={handleMenuItemClick} collapsed={!drawerOpen} />
				</List>
				<Divider />
			</Drawer>
			<UserModal
				open={userModalOpen}
				onClose={() => setUserModalOpen(false)}
				userId={user?.id}
			/>
			<AppBar
				position="absolute"
				className={clsx(classes.appBar, drawerOpen && classes.appBarShift)}
				color="primary"
			>
				<Toolbar variant="dense" className={classes.toolbar}>
					<IconButton
						edge="start"
						variant="contained"
						aria-label="open drawer"
						onClick={() => setDrawerOpen(!drawerOpen)}
						className={clsx(
							classes.menuButton,
							drawerOpen && classes.menuButtonHidden
						)}
					>
						<MenuIcon />
					</IconButton>

					<Typography
						component="h2"
						variant="h6"
						color="inherit"
						noWrap
						className={classes.title}
					>
						{(() => {
							const timeString = currentTime.toLocaleTimeString('pt-BR', {
								hour: '2-digit',
								minute: '2-digit',
								second: '2-digit',
								hour12: false
							});

							const welcomeMessage = (
								<>
									Olá <b>{user?.name || 'Usuário'}</b>, Bem vindo a <b>{user?.company?.name || 'Empresa'}</b>!
								</>
							);

							if (greaterThenSm && user?.profile === "admin" && user?.company?.dueDate) {
								const { difData } = getDateAndDifDays(user.company.dueDate);
								if (difData < 7) {
									return (
										<>
											{welcomeMessage} (Ativo até {dateToClient(user.company.dueDate)}) - {timeString}
										</>
									);
								}
							}

							return <>{welcomeMessage} - {timeString}</>;
						})()}
					</Typography>

					<IconButton edge="start" onClick={colorMode.toggleColorMode}>
						{theme.mode === 'dark' ? <Brightness7Icon style={{ color: "white" }} /> : <Brightness4Icon style={{ color: "white" }} />}
					</IconButton>
					{connectionWarning && (
						<Tooltip title="Há conexões desconectadas">
							<IconButton
								onClick={() => history.push("/connections")}
								style={{ color: "red" }}
							>
								<SignalCellularConnectedNoInternet0BarIcon />
							</IconButton>
						</Tooltip>
					)}

					<NotificationsVolume
						setVolume={setVolume}
						volume={volume}
					/>

					<IconButton
						onClick={handleRefreshPage}
						aria-label={i18n.t("mainDrawer.appBar.refresh")}
						color="inherit"
					>
						<CachedIcon style={{ color: "white" }} />
					</IconButton>

					{user.id && <NotificationsPopOver volume={volume} />}

					<AnnouncementsPopover />

					<ChatPopover />

					<div>
						<IconButton
							aria-label="account of current user"
							aria-controls="menu-appbar"
							aria-haspopup="true"
							onClick={handleMenu}
							variant="contained"
							style={{ color: "white" }}
						>
							<AccountCircle />
						</IconButton>
						<Menu
							id="menu-appbar"
							anchorEl={anchorEl}
							getContentAnchorEl={null}
							anchorOrigin={{
								vertical: "bottom",
								horizontal: "right",
							}}
							transformOrigin={{
								vertical: "top",
								horizontal: "right",
							}}
							open={menuOpen}
							onClose={handleCloseMenu}
						>
							<MenuItem onClick={handleOpenUserModal}>
								<PersonIcon style={{ marginRight: 8 }} />
								{i18n.t("mainDrawer.appBar.user.profile")}
							</MenuItem>
							<MenuItem onClick={handleClickLogout}>
								<ExitToAppIcon style={{ marginRight: 8 }} />
								{i18n.t("mainDrawer.appBar.user.logout")}
							</MenuItem>
						</Menu>
					</div>
				</Toolbar>
			</AppBar>
			<main className={classes.content}>
				<div className={classes.appBarSpacer} />

				{children ? children : null}
			</main>
		</div>
	);
};

export default LoggedInLayout;
