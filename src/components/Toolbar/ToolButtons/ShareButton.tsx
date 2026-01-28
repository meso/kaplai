import { assets } from "@kaplayjs/crew";
import { openShareQRDialog } from "../../ShareQRDialog";
import { ToolbarButton } from "../ToolbarButton";

export const ShareButton = () => {
    return (
        <ToolbarButton
            icon={assets.share.outlined}
            text="Share"
            onClick={openShareQRDialog}
            tip="Share with QR Code"
        />
    );
};
