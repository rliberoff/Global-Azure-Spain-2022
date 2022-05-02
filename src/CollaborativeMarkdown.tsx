import React from 'react';
import { ISharedStringHelperTextChangedEventArgs, SharedStringHelper } from '@fluid-experimental/react-inputs';
import MDEditor from '@uiw/react-md-editor';

interface ICollaborativeTextAreaProps {
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

    // Handles changes from remote...
    React.useEffect(() => {
        const handleTextChanged = (event: ISharedStringHelperTextChangedEventArgs) => {
            const newText = sharedStringHelper.getText();
            setText(newText);

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

    // Handles changes from local...
    const handleChange = (ev: React.FormEvent<HTMLTextAreaElement>) => {
        const textareaElement = ev.target as HTMLTextAreaElement;
        const newText = textareaElement.value;
        const newCaretPosition = textareaElement.selectionStart;

        const oldText = text;
        const oldSelectionStart = selectionStartRef.current;
        const oldSelectionEnd = selectionEndRef.current;

        storeSelectionInReact();
        setText(newText);

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
