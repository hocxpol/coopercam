import React, { useState, useRef, useEffect, useContext } from "react";

import { useHistory } from "react-router-dom";
import { format } from "date-fns";
import { SocketContext } from "../../context/Socket/SocketContext";

import useSound from "use-sound";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import ChatIcon from "@material-ui/icons/Chat";

import TicketListItem from "../TicketListItemCustom";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sounds/sound.mp3";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 350,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 350,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			maxWidth: 270,
		},
	},
	noShadow: {
		boxShadow: "none !important",
	},
}));

const NotificationsPopOver = (volume) => {
	const classes = useStyles();

	const history = useHistory();
	const { user } = useContext(AuthContext);
	const ticketIdUrl = +history.location.pathname.split("/")[2];
	const ticketIdRef = useRef(ticketIdUrl);
	const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);

	const [showPendingTickets, setShowPendingTickets] = useState(false);

	const [, setDesktopNotifications] = useState([]);

	const { tickets } = useTickets({ withUnreadMessages: "true" });

	const [play] = useSound(alertSound, volume);
	const soundAlertRef = useRef();

	const historyRef = useRef(history);

  const socketManager = useContext(SocketContext);

	useEffect(() => {
		const fetchSettings = async () => {
			try {

				if (user.allTicket === "enable") {
					setShowPendingTickets(true);
				}
			} catch (err) {
			  	toastError(err);
			}
		}
	  
		fetchSettings();
	}, []);

	useEffect(() => {
		soundAlertRef.current = play;

		if (!("Notification" in window)) {
			//console.log("This browser doesn't support notifications");
		} else {
			Notification.requestPermission();
		}
	}, [play]);

	useEffect(() => {
		const processNotifications = () => {
			if (showPendingTickets) {
				setNotifications(tickets);
			} else {
				const newNotifications = tickets.filter(ticket => ticket.status !== "pending");

				setNotifications(newNotifications);
			}
		}

		processNotifications();
	}, [tickets]);

	useEffect(() => {
		ticketIdRef.current = ticketIdUrl;
	}, [ticketIdUrl]);

	useEffect(() => {
    const socket = socketManager.getSocket(user.companyId);

		socket.on("ready", () => socket.emit("joinNotification"));

		socket.on(`company-${user.companyId}-ticket`, data => {
			if (data.action === "updateUnread" || data.action === "delete") {
				setNotifications(prevState => {
					const ticketIndex = prevState.findIndex(t => t.id === data.ticketId);
					if (ticketIndex !== -1) {
						prevState.splice(ticketIndex, 1);
						return [...prevState];
					}
					return prevState;
				});

				setDesktopNotifications(prevState => {
					const notfiticationIndex = prevState.findIndex(
						n => n.tag === String(data.ticketId)
					);
					if (notfiticationIndex !== -1) {
						prevState[notfiticationIndex].close();
						prevState.splice(notfiticationIndex, 1);
						return [...prevState];
					}
					return prevState;
				});
			}
		});

		socket.on(`company-${user.companyId}-appMessage`, data => {
			if (
				data.action === "create" && !data.message.fromMe && 
				(data.ticket.status !== "pending" ) &&
				(!data.message.read || data.ticket.status === "pending") &&
				(data.ticket.userId === user?.id || !data.ticket.userId) &&
				(user?.queues?.some(queue => (queue.id === data.ticket.queueId)) || !data.ticket.queueId)
			) {
				setNotifications(prevState => {
					const ticketIndex = prevState.findIndex(t => t.id === data.ticket.id);
					if (ticketIndex !== -1) {
						prevState[ticketIndex] = data.ticket;
						return [...prevState];
					}
					return [data.ticket, ...prevState];
				});

				const shouldNotNotificate =
					(data.message.ticketId === ticketIdRef.current &&
						document.visibilityState === "visible") ||
					(data.ticket.userId && data.ticket.userId !== user?.id) ||
					data.ticket.isGroup;

				if (shouldNotNotificate) return;

				handleNotifications(data);
			}
			// Notificação para mensagem apagada
			if (
				data.action === "update" &&
				data.message.isDeleted &&
				!data.message.fromMe
			) {
				const shouldNotNotificate =
					(data.message.ticketId === ticketIdRef.current &&
						document.visibilityState === "visible") ||
					(data.ticket.userId && data.ticket.userId !== user?.id) ||
					data.ticket.isGroup;

				if (shouldNotNotificate) return;

				const options = {
					body: data.message.body || "Mensagem apagada.",
					icon: data.contact?.urlPicture,
					tag: data.ticket.id,
					renotify: true,
				};

				const notification = new Notification(
					`${data.contact?.name || "Contato"} apagou uma mensagem`,
					options
				);

				notification.onclick = e => {
					e.preventDefault();
					window.focus();
					historyRef.current.push(`/tickets/${data.ticket.uuid}`);
				};

				setDesktopNotifications(prevState => {
					const notfiticationIndex = prevState.findIndex(
						n => n.tag === notification.tag
					);
					if (notfiticationIndex !== -1) {
						prevState[notfiticationIndex] = notification;
						return [...prevState];
					}
					return [notification, ...prevState];
				});

				soundAlertRef.current();
			}
			// Notificação para mensagem editada
			if (
				data.action === "update" &&
				(data.message.isEdited || data.message.mediaType === "editedMessage") &&
				!data.message.fromMe
			) {
				const shouldNotNotificate =
					(data.message.ticketId === ticketIdRef.current &&
						document.visibilityState === "visible") ||
					(data.ticket.userId && data.ticket.userId !== user?.id) ||
					data.ticket.isGroup;

				if (shouldNotNotificate) return;

				const options = {
					body: data.message.body || "Mensagem editada.",
					icon: data.contact?.urlPicture,
					tag: data.ticket.id,
					renotify: true,
				};

				const notification = new Notification(
					`${data.contact?.name || "Contato"} editou uma mensagem`,
					options
				);

				notification.onclick = e => {
					e.preventDefault();
					window.focus();
					historyRef.current.push(`/tickets/${data.ticket.uuid}`);
				};

				setDesktopNotifications(prevState => {
					const notfiticationIndex = prevState.findIndex(
						n => n.tag === notification.tag
					);
					if (notfiticationIndex !== -1) {
						prevState[notfiticationIndex] = notification;
						return [...prevState];
					}
					return [notification, ...prevState];
				});

				soundAlertRef.current();
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [user, showPendingTickets, socketManager]);

	const handleNotifications = data => {
		const { message, contact, ticket } = data;

		const options = {
			body: `${message.body} - ${format(new Date(), "HH:mm")}`,
			icon: contact.urlPicture,
			tag: ticket.id,
			renotify: true,
		};

		const notification = new Notification(
			`${i18n.t("tickets.notification.message")} ${contact.name}`,
			options
		);

		notification.onclick = e => {
			e.preventDefault();
			window.focus();
			historyRef.current.push(`/tickets/${ticket.uuid}`);
			// handleChangeTab(null, ticket.isGroup? "group" : "open");
		};

		setDesktopNotifications(prevState => {
			const notfiticationIndex = prevState.findIndex(
				n => n.tag === notification.tag
			);
			if (notfiticationIndex !== -1) {
				prevState[notfiticationIndex] = notification;
				return [...prevState];
			}
			return [notification, ...prevState];
		});

		soundAlertRef.current();
	};

	const handleClick = () => {
		setIsOpen(prevState => !prevState);
	};

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const NotificationTicket = ({ children }) => {
		return <div onClick={handleClickAway}>{children}</div>;
	};

	return (
		<>
			<IconButton
				onClick={handleClick}
				ref={anchorEl}
				aria-label="Open Notifications"
				color="inherit"
				style={{color:"white"}}
			>
				<Badge overlap="rectangular" badgeContent={notifications.length} color="secondary">
					<ChatIcon />
				</Badge>
			</IconButton>
			<Popover
				disableScrollLock
				open={isOpen}
				anchorEl={anchorEl.current}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				classes={{ paper: classes.popoverPaper }}
				onClose={handleClickAway}
			>
				<List dense className={classes.tabContainer}>
					{notifications.length === 0 ? (
						<ListItem>
							<ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
						</ListItem>
					) : (
						notifications.map(ticket => (
							<NotificationTicket key={ticket.id}>
								<TicketListItem ticket={ticket} />
							</NotificationTicket>
						))
					)}
				</List>
			</Popover>
		</>
	);
};

export default NotificationsPopOver;
