import { io, Socket } from "socket.io-client";

interface SocketConnectorOptions {
    Socket_URL: string;
    ISDEPLOYEE?: boolean;
}

class SocketConnector {
    private Socket_URL: string;
    private ISDEPLOYEE: boolean;

    constructor({ Socket_URL, ISDEPLOYEE = false }: SocketConnectorOptions) {
        this.Socket_URL = Socket_URL;
        this.ISDEPLOYEE = ISDEPLOYEE;
    }

    getSocket(): Socket {
        const DeployeeParams = this.ISDEPLOYEE ? { path: "/socket.io" } : {};

        const socket: Socket = io(this.Socket_URL, {
            transports: ["websocket"],
            reconnection: true,
            ...DeployeeParams
        });

        return socket;
    }
}

export default SocketConnector;
