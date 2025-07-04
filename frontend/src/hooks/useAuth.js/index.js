import { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";
import moment from "moment";
const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      const companyId = localStorage.getItem("companyId");
      if (config.url === "/auth/login") {
        if (token) {
          config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
        }
        return config;
      }
      if (token && companyId) {
        config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
        setIsAuth(true);
      }
      return config;
    },
    (error) => {
      Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      if (error?.response?.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { data } = await api.post("/auth/refresh_token");
          if (data) {
            localStorage.setItem("token", JSON.stringify(data.token));
            api.defaults.headers.Authorization = `Bearer ${data.token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Se falhar ao atualizar o token, limpa os dados e redireciona para login
          localStorage.removeItem("token");
          localStorage.removeItem("companyId");
          localStorage.removeItem("userId");
          api.defaults.headers.Authorization = undefined;
          setIsAuth(false);
          history.push("/login");
          return Promise.reject(refreshError);
        }
      }
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("companyId");
        localStorage.removeItem("userId");
        api.defaults.headers.Authorization = undefined;
        setIsAuth(false);
        history.push("/login");
      }
      return Promise.reject(error);
    }
  );

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          if (data && data.token && data.user && data.user.companyId) {
            localStorage.setItem("token", JSON.stringify(data.token));
            localStorage.setItem("companyId", data.user.companyId);
            api.defaults.headers.Authorization = `Bearer ${data.token}`;
            setIsAuth(true);
            setUser(data.user);
          } else {
            throw new Error("Invalid refresh token response");
          }
        } catch (err) {
          toastError(err);
          localStorage.removeItem("token");
          localStorage.removeItem("companyId");
          localStorage.removeItem("userId");
          api.defaults.headers.Authorization = undefined;
          setIsAuth(false);
          history.push("/login");
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (companyId) {
   
      const socket = socketManager.getSocket(companyId);

      socket.on(`company-${companyId}-user`, (data) => {
        if (data.action === "update" && data.user.id === user.id) {
          setUser(data.user);
        }
      });
    
    
    return () => {
      socket.disconnect();
    };
  }
  }, [socketManager, user]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      const {
        user: { companyId, id, company },
      } = data;

      if (has(company, "settings") && isArray(company.settings)) {
        const setting = company.settings.find(
          (s) => s.key === "campaignsEnabled"
        );
        if (setting && setting.value === "true") {
          localStorage.setItem("cshow", null); //regra pra exibir campanhas
        }
      }

      moment.locale('pt-br');
      const dueDate = data.user.company.dueDate;
      const hoje = moment(moment()).format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(dueDate).diff(moment(moment()).format());

      var before = moment(moment().format()).isBefore(dueDate);
      var dias = moment.duration(diff).asDays();

      if (before === true) {
        localStorage.setItem("token", JSON.stringify(data.token));
        localStorage.setItem("companyId", companyId);
        localStorage.setItem("userId", id);
        localStorage.setItem("companyDueDate", vencimento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));
        if (Math.round(dias) < 5) {
          toast.warn(`Sua assinatura vence em ${Math.round(dias)} ${Math.round(dias) === 1 ? 'dia' : 'dias'} `);
        }
        history.push("/tickets");
        setLoading(false);
      } else {
        toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
        setLoading(false);
      }

      //quebra linha 
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      await api.delete("/auth/logout");
      localStorage.clear();
      api.defaults.headers.Authorization = undefined;
      setIsAuth(false);
      setUser({});
      window.location.href = "/login";
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (err) {
      toastError(err);
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
  };
};

export default useAuth;
