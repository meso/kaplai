import * as Tabs from "@radix-ui/react-tabs";
import { Allotment } from "allotment";
import { type FC, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { AIChat } from "../../features/AIChat";
import { MonacoEditor } from "../../features/Editor/components/MonacoEditor.tsx";
import { useProject } from "../../features/Projects/stores/useProject.ts";
import { useEditor } from "../../hooks/useEditor.ts";
import { allotmentStorage } from "../../util/allotmentStorage.ts";
import { cn } from "../../util/cn";
import { scrollbarSize } from "../../util/scrollbarSize.ts";
import { AssetBrew } from "../AssetBrew/AssetBrew.tsx";
import { ConsoleView } from "../ConsoleView/ConsoleView.tsx";
import { Toolbar } from "../Toolbar";
import ExampleList from "../Toolbar/ExampleList";
import ToolbarToolsMenu from "../Toolbar/ToolbarToolsMenu";
import { GameView } from "./GameView";

type Props = {
    editorIsLoading: boolean;
    isPortrait: boolean;
    onMount?: () => void;
};

export const WorkspaceExample: FC<Props> = (props) => {
    const isWidescreen = useMediaQuery({ query: "(min-width: 900px)" });
    const { getAllotmentSize, setAllotmentSize } = allotmentStorage("example");
    const [activeTab, setActiveTab] = useState<"ai" | "code">("ai");

    const getMainFile = useProject((state) => state.getMainFile);
    const updateFile = useProject((state) => state.updateFile);
    const { run, setEditorValue } = useEditor();

    const { scrollbarThinHeight } = scrollbarSize();
    const assetBrewHeight = 72 + scrollbarThinHeight();

    const handleDragStart = () =>
        document.documentElement.classList.toggle("select-none", true);
    const handleDragEnd = () =>
        document.documentElement.classList.toggle("select-none", false);

    const handleCodeGenerated = (newCode: string) => {
        const mainFile = getMainFile();
        if (mainFile) {
            // Update the file in the store
            updateFile(mainFile.path, newCode);
            // Update the editor
            setEditorValue(newCode);
            // Run the game
            run();
            // Switch to code tab to show the result
            setActiveTab("code");
        }
    };

    const getCurrentCode = (): string => {
        const mainFile = getMainFile();
        return mainFile?.value ?? "";
    };

    return (
        <div
            className={cn("h-full w-screen flex flex-col gap-px bg-base-50", {
                "hidden": props.editorIsLoading,
            })}
        >
            <header className="h-9 flex flex-col">
                {isWidescreen ? <Toolbar /> : <ToolbarToolsMenu />}
            </header>

            <main className="h-full min-h-0 overflow-hidden">
                <Allotment
                    vertical={props.isPortrait}
                    defaultSizes={getAllotmentSize("editor")}
                    onChange={e => setAllotmentSize("editor", e)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    key={`vertical-${props.isPortrait}`}
                >
                    <Allotment.Pane snap>
                        <Tabs.Root
                            value={activeTab}
                            onValueChange={(v) =>
                                setActiveTab(v as "ai" | "code")}
                            className="h-full flex flex-col"
                        >
                            {/* Tab List - larger touch targets for tablets */}
                            <Tabs.List className="flex bg-base-200 border-b border-base-300">
                                <Tabs.Trigger
                                    value="ai"
                                    className={cn(
                                        "flex-1 px-4 py-3 sm:py-4 text-base sm:text-lg font-medium transition-colors",
                                        "hover:bg-base-300/50 active:bg-base-300",
                                        "data-[state=active]:bg-base-100 data-[state=active]:border-b-2 data-[state=active]:border-primary",
                                    )}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="text-xl">🤖</span>
                                        <span>AI</span>
                                    </span>
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value="code"
                                    className={cn(
                                        "flex-1 px-4 py-3 sm:py-4 text-base sm:text-lg font-medium transition-colors",
                                        "hover:bg-base-300/50 active:bg-base-300",
                                        "data-[state=active]:bg-base-100 data-[state=active]:border-b-2 data-[state=active]:border-primary",
                                    )}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="text-xl">📝</span>
                                        <span>コード</span>
                                    </span>
                                </Tabs.Trigger>
                            </Tabs.List>

                            {/* Tab Content */}
                            <Tabs.Content
                                value="ai"
                                className="flex-1 min-h-0"
                            >
                                <AIChat
                                    currentCode={getCurrentCode()}
                                    onCodeGenerated={handleCodeGenerated}
                                />
                            </Tabs.Content>

                            <Tabs.Content
                                value="code"
                                className="flex-1 min-h-0 data-[state=inactive]:hidden"
                                forceMount
                            >
                                <Allotment
                                    vertical
                                    defaultSizes={getAllotmentSize("brew", [
                                        9999,
                                        assetBrewHeight,
                                    ])}
                                    onChange={e => setAllotmentSize("brew", e)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    className="p-px pt-0"
                                >
                                    <Allotment.Pane>
                                        <MonacoEditor
                                            onMount={props.onMount}
                                        />
                                    </Allotment.Pane>
                                    <Allotment.Pane
                                        className="pt-px"
                                        snap
                                        maxSize={assetBrewHeight + 1}
                                        minSize={assetBrewHeight}
                                        preferredSize={assetBrewHeight}
                                    >
                                        <AssetBrew />
                                    </Allotment.Pane>
                                </Allotment>
                            </Tabs.Content>
                        </Tabs.Root>
                    </Allotment.Pane>
                    <Allotment.Pane snap>
                        <Allotment
                            vertical
                            defaultSizes={getAllotmentSize("console", [
                                9999,
                                34,
                            ])}
                            onChange={e => setAllotmentSize("console", e)}
                            className="pr-px pb-px"
                        >
                            <Allotment.Pane>
                                <GameView />
                            </Allotment.Pane>
                            <Allotment.Pane
                                className="pt-px"
                                snap
                                minSize={34}
                                preferredSize={34}
                            >
                                <ConsoleView />
                            </Allotment.Pane>
                        </Allotment>
                    </Allotment.Pane>
                </Allotment>
            </main>

            {!isWidescreen && (
                <footer className="h-9 flex justify-center items-center -mt-px px-1 bg-base-300 rounded-t-xl">
                    <ExampleList />
                </footer>
            )}
        </div>
    );
};
