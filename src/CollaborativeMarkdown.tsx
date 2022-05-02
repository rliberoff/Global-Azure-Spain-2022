import React from 'react';
import { ISharedStringHelperTextChangedEventArgs, SharedStringHelper } from '@fluid-experimental/react-inputs';
import MDEditor from '@uiw/react-md-editor';

interface ICollaborativeTextAreaProps {
    /**
     * The SharedString that will store the text from the textarea.
     */
    sharedStringHelper: SharedStringHelper;
    textAreaSuffixId: string;
}

export const CollaborativeMarkdown = (props: ICollaborativeTextAreaProps) => {
    const sharedStringHelper = props.sharedStringHelper;
    const textareaId = 'mdeditor_textarea_' + props.textAreaSuffixId;
    const selectionStartRef = React.useRef<number>(0);
    const selectionEndRef = React.useRef<number>(0);

    const [text, setText] = React.useState(sharedStringHelper.getText());

    const storeSelectionInReact = () => {
        const textareaElement = document.getElementById(textareaId) as HTMLTextAreaElement;
        const textareaSelectionStart = textareaElement.selectionStart;
        const textareaSelectionEnd = textareaElement.selectionEnd;
        selectionStartRef.current = textareaSelectionStart;
        selectionEndRef.current = textareaSelectionEnd;
    };

    const setTextareaSelection = (newStart: number, newEnd: number) => {
        const textareaElement = document.getElementById(textareaId) as HTMLTextAreaElement;
        textareaElement.selectionStart = newStart;
        textareaElement.selectionEnd = newEnd;
    };

    React.useEffect(() => {
        /**
         * There's been a change to the SharedString's data.  This means the most recent state of the text
         * is in the SharedString, and we need to
         * 1. Store the text state in React
         * 2. If the change came from a remote source, it may have moved our selection.  Compute it, update
         *    the textarea, and store it in React
         */
        const handleTextChanged = (event: ISharedStringHelperTextChangedEventArgs) => {
            const newText = sharedStringHelper.getText();
            setText(newText);

            // If the event was our own then the caret will already be in the new location.
            // Otherwise, transform our selection position based on the change.
            if (!event.isLocal) {
                const newSelectionStart = event.transformPosition(selectionStartRef.current);
                const newSelectionEnd = event.transformPosition(selectionEndRef.current);
                setTextareaSelection(newSelectionStart, newSelectionEnd);
                storeSelectionInReact();
            }
        };

        sharedStringHelper.on('textChanged', handleTextChanged);
        return () => {
            sharedStringHelper.off('textChanged', handleTextChanged);
        };
    });

    const handleChange = (ev: React.FormEvent<HTMLTextAreaElement>) => {
        const textareaElement = ev.target as HTMLTextAreaElement;
        const newText = textareaElement.value;
        // After a change to the textarea content we assume the selection is gone (just a caret)
        // This is a bad assumption (e.g. performing undo will select the re-added content).
        const newCaretPosition = textareaElement.selectionStart;

        // Next get and stash the old React state
        const oldText = text;
        const oldSelectionStart = selectionStartRef.current;
        const oldSelectionEnd = selectionEndRef.current;

        // Next update the React state with the values from the textarea
        storeSelectionInReact();
        setText(newText);

        // Finally update the SharedString with the values after deducing what type of change it was.
        // If the caret moves to the right of the prior left bound of the selection, we assume an insert occurred
        // This is also a bad assumption, in the undo case.
        const isTextInserted = newCaretPosition - oldSelectionStart > 0;
        if (isTextInserted) {
            const insertedText = newText.substring(oldSelectionStart, newCaretPosition);
            const isTextReplaced = oldSelectionEnd - oldSelectionStart > 0;
            if (!isTextReplaced) {
                sharedStringHelper.insertText(insertedText, oldSelectionStart);
            } else {
                sharedStringHelper.replaceText(insertedText, oldSelectionStart, oldSelectionEnd);
            }
        } else {
            // Text was removed
            const charactersDeleted = oldText.length - newText.length;
            sharedStringHelper.removeText(newCaretPosition, newCaretPosition + charactersDeleted);
        }
    };

    return (
        <div className='container'>
            <MDEditor
                autoFocus={true}
                value={text}
                height={500}
                maxHeight={700}
                minHeight={500}
                onChange={(newValue = text) => setText(newValue)}
                textareaProps={{
                    placeholder: 'Comenzad a escribir...',
                    id: textareaId,
                    onBeforeInput: (e) => storeSelectionInReact(),
                    onKeyDown: (e) => storeSelectionInReact(),
                    onClick: (e) => storeSelectionInReact(),
                    onContextMenu: (e) => storeSelectionInReact(),
                    onChange: (e) => handleChange(e),
                }}
            />
        </div>
    );
};
