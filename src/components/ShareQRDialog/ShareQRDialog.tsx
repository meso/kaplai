import { useEffect, useState } from "react";
import { useProject } from "../../features/Projects/stores/useProject";
import { compressCode } from "../../util/compressCode";
import { openDialog } from "../../util/openDialog";
import { Dialog } from "../UI/Dialog";

// Use QR Server API for QR code generation (simple and reliable)
const generateQRCodeUrl = (text: string, size: number = 256): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=svg`;
};

export const ShareQRDialog = () => {
    const [qrUrl, setQrUrl] = useState<string>("");
    const [shareUrl, setShareUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [isUrlTooLong, setIsUrlTooLong] = useState(false);

    const getMainFile = useProject((s) => s.getMainFile);

    useEffect(() => {
        const handleDialogOpen = (e: CustomEvent) => {
            if (e.detail?.id !== "share-qr") return;
            generateShareUrl();
        };

        window.addEventListener(
            "dialog-open",
            handleDialogOpen as EventListener,
        );
        return () => {
            window.removeEventListener(
                "dialog-open",
                handleDialogOpen as EventListener,
            );
        };
    }, []);

    const generateShareUrl = () => {
        const demoKey = useProject.getState().demoKey;
        const kaplayVersion = useProject.getState().project.kaplayVersion;

        let url: string;

        if (demoKey) {
            const exampleParam = encodeURIComponent(demoKey);
            url = `${window.location.origin}/?example=${exampleParam}`;
        } else {
            const mainFile = getMainFile();
            const compressedCode = compressCode(mainFile?.value || "");
            const codeParam = encodeURIComponent(compressedCode);
            const exampleVersion = encodeURIComponent(kaplayVersion);
            url = `${window.location.origin}/?code=${codeParam}&version=${exampleVersion}`;
        }

        setShareUrl(url);

        // Check if URL is too long
        if (url.length > 2048) {
            setIsUrlTooLong(true);
            setQrUrl("");
        } else {
            setIsUrlTooLong(false);
            setQrUrl(generateQRCodeUrl(url));
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleClose = () => {
        document.querySelector<HTMLDialogElement>("#share-qr")?.close();
    };

    return (
        <Dialog id="share-qr" mainClass="max-w-sm">
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-bold">ゲームをシェア</h2>

                {isUrlTooLong
                    ? (
                        <div className="w-64 h-64 flex items-center justify-center bg-error/20 rounded-lg text-center p-4">
                            <p className="text-error text-sm">
                                コードが長すぎてQRコードを作成できません。<br />
                                コードを短くしてください。
                            </p>
                        </div>
                    )
                    : qrUrl
                    ? (
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <img
                                src={qrUrl}
                                alt="QR Code"
                                className="w-56 h-56"
                            />
                        </div>
                    )
                    : (
                        <div className="w-64 h-64 flex items-center justify-center bg-base-200 rounded-lg">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    )}

                <p className="text-sm text-base-content/70 text-center max-w-xs">
                    QRコードをスマホで読み取ると、<br />
                    このゲームで遊べるよ！
                </p>

                <div className="flex flex-col gap-2 w-full">
                    <button
                        className={`btn ${copied ? "btn-success" : "btn-primary"} w-full`}
                        onClick={handleCopy}
                        disabled={isUrlTooLong}
                    >
                        {copied ? "✓ コピーしました！" : "URLをコピー"}
                    </button>

                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleClose}
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export const openShareQRDialog = () => {
    openDialog("share-qr", { lazy: false });
};
