package com.game.systems;

import com.game.model.NetworkMessage;

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

    public static CommandResult error(String code, String message) {
        return new CommandResult(false, null, code, message);
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

    public NetworkMessage toNetworkMessage(long tick) {
        if (accepted) {
            return NetworkMessage.ack(tick, commandType);
        }
        return NetworkMessage.error(tick, errorCode, errorMessage);
    }
}
