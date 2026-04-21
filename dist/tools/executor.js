/**
 * Tool Executor
 *
 * Executes tool calls and returns results.
 */
import { readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
/**
 * Execute a tool call and return the result
 */
export async function executeTool(toolCall) {
    const { name, input, id } = toolCall;
    console.log(`  Executing tool: ${name}`);
    try {
        switch (name) {
            case 'read_file': {
                const filePath = input.file_path;
                const content = await readFile(filePath, 'utf-8');
                return {
                    tool_call_id: id,
                    content: content.substring(0, 10000),
                };
            }
            case 'write_file': {
                const filePath = input.file_path;
                const content = input.content;
                await writeFile(filePath, content, 'utf-8');
                return {
                    tool_call_id: id,
                    content: `Successfully wrote ${content.length} characters to ${filePath}`,
                };
            }
            case 'execute_command': {
                const command = input.command;
                const cwd = input.cwd;
                // Security check
                const dangerous = ['rm -rf /', '> /dev/null', 'curl | bash', '; rm', '&& rm'];
                if (dangerous.some(d => command.includes(d))) {
                    throw new Error('Command blocked for security');
                }
                const { stdout, stderr } = await execAsync(command, { cwd });
                return {
                    tool_call_id: id,
                    content: stdout || stderr || 'Command executed successfully',
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            tool_call_id: id,
            content: `Error executing ${name}: ${error.message}`,
            isError: true,
        };
    }
}
//# sourceMappingURL=executor.js.map