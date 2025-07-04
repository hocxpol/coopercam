import React, { useContext, useEffect, useReducer, useState } from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";

import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import { Badge, Collapse, List } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CodeRoundedIcon from "@material-ui/icons/CodeRounded";
import EventIcon from "@material-ui/icons/Event";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import PeopleIcon from "@material-ui/icons/People";
import ListIcon from "@material-ui/icons/ListAlt";
import AnnouncementIcon from "@material-ui/icons/Announcement";
import ForumIcon from "@material-ui/icons/Forum";
import LocalAtmIcon from '@material-ui/icons/LocalAtm';
import RotateRight from "@material-ui/icons/RotateRight";
import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import LoyaltyRoundedIcon from '@material-ui/icons/LoyaltyRounded';
import { Can } from "../components/Can";
import { SocketContext } from "../context/Socket/SocketContext";
import { isArray } from "lodash";
import TableChartIcon from '@material-ui/icons/TableChart';
import api from "../services/api";
import BorderColorIcon from '@material-ui/icons/BorderColor';
import ToDoList from "../pages/ToDoList/";
import toastError from "../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { AllInclusive, AttachFile, BlurCircular, DeviceHubOutlined, Schedule } from '@material-ui/icons';
import usePlans from "../hooks/usePlans";
import Typography from "@material-ui/core/Typography";
import useVersion from "../hooks/useVersion";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  ListSubheader: {
    height: 26,
    marginTop: "-15px",
    marginBottom: "-10px",
  },
}));


function ListItemLink(props) {
  const { icon, primary, to, className } = props;

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button dense component={renderLink} className={className}>
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}

const reducer = (state, action) => {
  if (action.type === "LOAD_CHATS") {
    const chats = action.payload;
    const newChats = [];

    if (isArray(chats)) {
      chats.forEach((chat) => {
        const chatIndex = state.findIndex((u) => u.id === chat.id);
        if (chatIndex !== -1) {
          state[chatIndex] = chat;
        } else {
          newChats.push(chat);
        }
      });
    }

    return [...state, ...newChats];
  }

  if (action.type === "UPDATE_CHATS") {
    const chat = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chat.id);

    if (chatIndex !== -1) {
      state[chatIndex] = chat;
      return [...state];
    } else {
      return [chat, ...state];
    }
  }

  if (action.type === "DELETE_CHAT") {
    const chatId = action.payload;

    const chatIndex = state.findIndex((u) => u.id === chatId);
    if (chatIndex !== -1) {
      state.splice(chatIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "CHANGE_CHAT") {
    const changedChats = state.map((chat) => {
      if (chat.id === action.payload.chat.id) {
        return action.payload.chat;
      }
      return chat;
    });
    return changedChats;
  }
};

const MainListItems = (props) => {
  const classes = useStyles();
  const { drawerClose, collapsed } = props;
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user, handleLogout } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [openCampaignSubmenu, setOpenCampaignSubmenu] = useState(false);
  const [openIntegrationsSubmenu, setOpenIntegrationsSubmenu] = useState(false);
  const [openAdminSubmenu, setOpenAdminSubmenu] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [showInternalChat, setShowInternalChat] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false); const history = useHistory();
  const [showExternalApi, setShowExternalApi] = useState(false);


  const [invisible, setInvisible] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam] = useState("");
  const [chats, dispatch] = useReducer(reducer, []);
  const { getPlanCompany } = usePlans();
  
  const [version, setVersion] = useState(false);
  
  
  const { getVersion } = useVersion();

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    async function fetchVersion() {
      const _version = await getVersion();
      setVersion(_version.version);
    }
    fetchVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    async function fetchData() {
      try {
        const companyId = user?.companyId;
        if (!companyId) {
          toast.error("Company ID is required");
          return;
        }
        const planConfigs = await getPlanCompany(undefined, companyId);
        if (planConfigs) {
          setShowCampaigns(planConfigs.plan.useCampaigns);
          setShowKanban(planConfigs.plan.useKanban);
          setShowOpenAi(planConfigs.plan.useOpenAi);
          setShowIntegrations(planConfigs.plan.useIntegrations);
          setShowSchedules(planConfigs.plan.useSchedules);
          setShowInternalChat(planConfigs.plan.useInternalChat);
          setShowExternalApi(planConfigs.plan.useExternalApi);
        }
      } catch (err) {
        toastError(err);
      }
    }
    if (user?.companyId) {
      fetchData();
    }
  }, [user?.companyId]);



  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchChats();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-chat`, (data) => {
      if (data.action === "new-message") {
        dispatch({ type: "CHANGE_CHAT", payload: data });
      }
      if (data.action === "update") {
        dispatch({ type: "CHANGE_CHAT", payload: data });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  useEffect(() => {
    let unreadsCount = 0;
    if (chats.length > 0) {
      for (let chat of chats) {
        for (let chatUser of chat.users) {
          if (chatUser.userId === user.id) {
            unreadsCount += chatUser.unreads;
          }
        }
      }
    }
    if (unreadsCount > 0) {
      setInvisible(false);
    } else {
      setInvisible(true);
    }
  }, [chats, user.id]);

  useEffect(() => {
    if (localStorage.getItem("cshow")) {
      setShowCampaigns(true);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
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

  const fetchChats = async () => {
    try {
      const { data } = await api.get("/chats/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CHATS", payload: data.records });
    } catch (err) {
      toastError(err);
    }
  };

  const handleClickLogout = () => {
    //handleCloseMenu();
    handleLogout();
  };

	return (
		<div onClick={drawerClose}>
			{/* Grupo Principal - Funcionalidades Básicas */}
			<ListSubheader
				hidden={collapsed}
				style={{
					position: "relative",
					fontSize: "12px",
					textAlign: "left",
					textTransform: "uppercase",
					paddingLeft: 20
				}}
				inset
				color="inherit">
				{i18n.t("mainDrawer.listItems.main")}
			</ListSubheader>

			<Can
				role={user.profile}
				perform="dashboard:view"
				yes={() => (
					<ListItemLink
						to="/"
						primary={i18n.t("mainDrawer.listItems.dashboard")}
						icon={<DashboardOutlinedIcon />}
					/>
				)}
			/>

			<ListItemLink
				to="/tickets"
				primary={i18n.t("mainDrawer.listItems.tickets")}
				icon={<WhatsAppIcon />}
			/>

			{showSchedules && (
			<ListItemLink
				to="/schedules"
				primary={i18n.t("mainDrawer.listItems.schedules")}
				icon={<EventIcon />}
			/>
			)}

			<ListItemLink
				to="/contacts"
				primary={i18n.t("mainDrawer.listItems.contacts")}
				icon={<ContactPhoneOutlinedIcon />}
			/>

			<ListItemLink
				to="/tags"
				primary={i18n.t("mainDrawer.listItems.tags")}
				icon={<LocalOfferIcon />}
			/>

			{showKanban && (
				<ListItemLink
					to="/kanban"
					primary={i18n.t("mainDrawer.listItems.kanban")}
					icon={<TableChartIcon />}
				/>
			)}

			<ListItemLink
				to="/quick-messages"
				primary={i18n.t("mainDrawer.listItems.quickMessages")}
				icon={<FlashOnIcon />}
			/>

			<ListItemLink
				to="/todolist"
				primary={i18n.t("mainDrawer.listItems.tasks")}
				icon={<BorderColorIcon />}
			/>
			
			{showInternalChat && (
				<ListItemLink
					to="/chats"
					primary={i18n.t("mainDrawer.listItems.chats")}
					icon={<ForumIcon />}
				/>
			)}

			<ListItemLink
				to="/helps"
				primary={i18n.t("mainDrawer.listItems.help")}
				icon={<HelpOutlineIcon />}
			/>

			<Divider />

			{/* Grupo de Administração */}
			<Can
				role={user.profile}
				perform="drawer-admin-items:view"
				yes={() => (
					<>
						<ListItem
							button
							onClick={() => setOpenAdminSubmenu((prev) => !prev)}
						>
							<ListItemIcon>
								<SettingsOutlinedIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n.t("mainDrawer.listItems.management")}
							/>
							{openAdminSubmenu ? (
								<ExpandLessIcon />
							) : (
								<ExpandMoreIcon />
							)}
						</ListItem>
						<Collapse
							style={{ paddingLeft: 15 }}
							in={openAdminSubmenu}
							timeout="auto"
							unmountOnExit
						>
							<List component="div" disablePadding>
								<ListItemLink
									to="/connections"
									primary={i18n.t("mainDrawer.listItems.connections")}
									icon={
										<Badge badgeContent={connectionWarning ? "!" : 0} color="error">
											<SyncAltIcon />
										</Badge>
									}
								/>

								<ListItemLink
									to="/queues"
									primary={i18n.t("mainDrawer.listItems.queues")}
									icon={<AccountTreeOutlinedIcon />}
								/>

								<ListItemLink
									to="/users"
									primary={i18n.t("mainDrawer.listItems.users")}
									icon={<PeopleAltOutlinedIcon />}
								/>

								<ListItemLink
									to="/files"
									primary={i18n.t("mainDrawer.listItems.files")}
									icon={<AttachFile />}
								/>

								{user.super && (
									<ListItemLink
										to="/announcements"
										primary={i18n.t("mainDrawer.listItems.annoucements")}
										icon={<AnnouncementIcon />}
									/>
								)}

								<ListItemLink
									to="/financial"
									primary={i18n.t("mainDrawer.listItems.financial")}
									icon={<LocalAtmIcon />}
								/>

								<ListItemLink
									to="/settings"
									primary={i18n.t("mainDrawer.listItems.settings")}
									icon={<SettingsOutlinedIcon />}
								/>
							</List>
						</Collapse>

						{/* Subgrupo de Campanhas */}
						{showCampaigns && (
							<>
								<Divider />
								<ListItem
									button
									onClick={() => setOpenCampaignSubmenu((prev) => !prev)}
								>
									<ListItemIcon>
										<EventAvailableIcon />
									</ListItemIcon>
									<ListItemText
										primary={i18n.t("mainDrawer.listItems.campaigns")}
									/>
									{openCampaignSubmenu ? (
										<ExpandLessIcon />
									) : (
										<ExpandMoreIcon />
									)}
								</ListItem>
								<Collapse
									style={{ paddingLeft: 15 }}
									in={openCampaignSubmenu}
									timeout="auto"
									unmountOnExit
								>
									<List component="div" disablePadding>
										<ListItem onClick={() => history.push("/campaigns")} button>
											<ListItemIcon>
												<ListIcon />
											</ListItemIcon>
											<ListItemText primary={i18n.t("mainDrawer.listItems.campaigns")} />
										</ListItem>
										<ListItem
											onClick={() => history.push("/contact-lists")}
											button
										>
											<ListItemIcon>
												<PeopleIcon />
											</ListItemIcon>
											<ListItemText primary={i18n.t("mainDrawer.listItems.contactLists")} />
										</ListItem>
										<ListItem
											onClick={() => history.push("/campaigns-config")}
											button
										>
											<ListItemIcon>
												<SettingsOutlinedIcon />
											</ListItemIcon>
											<ListItemText primary={i18n.t("mainDrawer.listItems.campaignsConfig")} />
										</ListItem>
									</List>
								</Collapse>
							</>
						)}

						{/* Subgrupo de Integrações */}
						{(showOpenAi || showIntegrations || showExternalApi) && (
							<>
								<Divider />
								<ListItem
									button
									onClick={() => setOpenIntegrationsSubmenu((prev) => !prev)}
								>
									<ListItemIcon>
										<DeviceHubOutlined />
									</ListItemIcon>
									<ListItemText
										primary={i18n.t("mainDrawer.listItems.queueIntegration")}
									/>
									{openIntegrationsSubmenu ? (
										<ExpandLessIcon />
									) : (
										<ExpandMoreIcon />
									)}
								</ListItem>
								<Collapse
									style={{ paddingLeft: 15 }}
									in={openIntegrationsSubmenu}
									timeout="auto"
									unmountOnExit
								>
									<List component="div" disablePadding>
										{showOpenAi && (
											<ListItem onClick={() => history.push("/prompts")} button>
												<ListItemIcon>
													<AllInclusive />
												</ListItemIcon>
												<ListItemText primary={i18n.t("mainDrawer.listItems.prompts")} />
											</ListItem>
										)}

										{showIntegrations && (
											<ListItem onClick={() => history.push("/queue-integration")} button>
												<ListItemIcon>
													<DeviceHubOutlined />
												</ListItemIcon>
												<ListItemText primary={i18n.t("mainDrawer.listItems.queueIntegration")} />
											</ListItem>
										)}

										{showExternalApi && (
											<ListItem onClick={() => history.push("/messages-api")} button>
												<ListItemIcon>
													<CodeRoundedIcon />
												</ListItemIcon>
												<ListItemText primary={i18n.t("mainDrawer.listItems.messagesAPI")} />
											</ListItem>
										)}
									</List>
								</Collapse>
							</>
						)}

						{/* Rodapé do Menu */}
						{!collapsed && (
							<React.Fragment>
								<Divider />
								<Typography
									style={{
										fontSize: "12px",
										padding: "10px",
										textAlign: "right",
										fontWeight: "bold",
										color: "rgba(0, 0, 0, 0.54)"
									}}
								>
									{`v${version}`}
								</Typography>
							</React.Fragment>
						)}
					</>
				)}
			/>
		</div>
	);
};

export default MainListItems;
