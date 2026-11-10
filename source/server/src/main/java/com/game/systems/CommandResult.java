package com.game.systems;

import com.game.model.NetworkMessage;

/**
 * Kết quả xử lý một command từ client theo đúng hợp đồng Mục 3 & Mục 7 docs/protocol-v1.md:
 * - Hợp lệ -> trả ACK {commandType}
 * - Từ chối -> trả ERROR {code, message}
 */
public class CommandResult {
    private final boolean accepted;
    private final String commandType;
    private final String errorCode;
    private final String errorMessage;

    private CommandResult(boolean accepted, String commandType, String errorCode, String errorMessage) {
        this.accepted = accepted;
        this.commandType = commandType;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }

    public static CommandResult ack(String commandType) {
        return new CommandResult(true, commandType, null, null);
    }

    public static CommandResult error(String errorCode, String errorMessage) {
        return new CommandResult(false, null, errorCode, errorMessage);
    }

    public boolean isAccepted() {
        return accepted;
    }

    public String getCommandType() {
        return commandType;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public NetworkMessage toNetworkMessage(Long requestId, long tick) {
        if (accepted) {
            return NetworkMessage.ack(requestId, tick, commandType);
        }
        return NetworkMessage.error(requestId, tick, errorCode, errorMessage);
    }
}
