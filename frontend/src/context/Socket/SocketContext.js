import { createContext } from "react";
import openSocket from "socket.io-client";
import jwt from "jsonwebtoken";

class ManagedSocket {
	constructor(socketManager) {
		this.socketManager = socketManager;
		this.rawSocket = socketManager.currentSocket;
		this.callbacks = [];
		this.joins = [];

		this.rawSocket.on("connect", () => {
			if (!this.rawSocket.recovered) {
				const refreshJoinsOnReady = () => {
					for (const j of this.joins) {
						this.rawSocket.emit(`join${j.event}`, ...j.params);
					}
					this.rawSocket.off("ready", refreshJoinsOnReady);
				};
				for (const j of this.callbacks) {
					this.rawSocket.off(j.event, j.callback);
					this.rawSocket.on(j.event, j.callback);
				}

				this.rawSocket.on("ready", refreshJoinsOnReady);
			}
		});

		this.rawSocket.on("disconnect", (reason) => {
			console.log("[Socket] Disconnected", { reason, socket: this.rawSocket.id });
		});

		this.rawSocket.on("error", (error) => {
			console.error("[Socket] Error", { error, socket: this.rawSocket.id });
		});
	}

	on(event, callback) {
		if (event === "ready" || event === "connect") {
			return this.socketManager.onReady(callback);
		}
		this.callbacks.push({ event, callback });
		return this.rawSocket.on(event, callback);
	}

	off(event, callback) {
		const i = this.callbacks.findIndex((c) => c.event === event && c.callback === callback);
		this.callbacks.splice(i, 1);
		return this.rawSocket.off(event, callback);
	}

	emit(event, ...params) {
		if (event.startsWith("join")) {
			this.joins.push({ event: event.substring(4), params });
		}
		return this.rawSocket.emit(event, ...params);
	}

	disconnect() {
		for (const j of this.joins) {
			this.rawSocket.emit(`leave${j.event}`, ...j.params);
		}
		this.joins = [];
		for (const c of this.callbacks) {
			this.rawSocket.off(c.event, c.callback);
		}
		this.callbacks = [];
	}
}

class DummySocket {
	on(..._) { }
	off(..._) { }
	emit(..._) { }
	disconnect() { }
}

const SocketManager = {
	currentCompanyId: -1,
	currentUserId: -1,
	currentSocket: null,
	socketReady: false,

	getSocket: function (companyId) {
		let userId = null;
		if (localStorage.getItem("userId")) {
			userId = localStorage.getItem("userId");
		}

		if (!companyId && !this.currentSocket) {
			return new DummySocket();
		}

		if (companyId && typeof companyId !== "string") {
			companyId = `${companyId}`;
		}

		if (companyId !== this.currentCompanyId || userId !== this.currentUserId) {
			if (this.currentSocket) {
				this.currentSocket.removeAllListeners();
				this.currentSocket.disconnect();
				this.currentSocket = null;
			}

			let token = JSON.parse(localStorage.getItem("token"));
			const { exp } = jwt.decode(token);

			if (Date.now() >= exp * 1000) {
				console.warn("[SocketManager] Token expired, reloading after refresh");
				setTimeout(() => {
					window.location.reload();
				}, 1000);
				return new DummySocket();
			}

			this.currentCompanyId = companyId;
			this.currentUserId = userId;

			if (!token) {
				return new DummySocket();
			}

			this.currentSocket = openSocket(process.env.REACT_APP_BACKEND_URL, {
				transports: ["websocket"],
				pingTimeout: 18000,
				pingInterval: 18000,
				query: { token },
			});

			this.currentSocket.on("disconnect", (reason) => {
				if (reason.startsWith("io ")) {
					const { exp } = jwt.decode(token);
					if (Date.now() - 180 >= exp * 1000) {
						window.location.reload();
						return;
					}

					this.currentSocket.connect();
				}
			});

			this.currentSocket.on("connect", () => {
				this.socketReady = true;
			});
		}

		return new ManagedSocket(this);
	},

	onReady: function (callbackReady) {
		if (this.socketReady) {
			callbackReady();
			return;
		}

		this.currentSocket.once("ready", () => {
			callbackReady();
		});
	},

};

const SocketContext = createContext()

export { SocketContext, SocketManager };
