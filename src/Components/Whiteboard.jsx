import React, { useState, useEffect, useRef } from 'react';
import './Whiteboard.css';

const Whiteboard = ({ socket, currentUsername, recipientUsername }) => {
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const context = canvas.getContext("2d");
        context.scale(2, 2);
        context.lineCap = "round";
        context.strokeStyle = "black";
        context.lineWidth = 3;
        contextRef.current = context;
    }, []);

    const drawLine = (x0, y0, x1, y1, emit) => {
        contextRef.current.beginPath();
        contextRef.current.moveTo(x0, y0);
        contextRef.current.lineTo(x1, y1);
        contextRef.current.stroke();
        contextRef.current.closePath();

        if (!emit) { return; }
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
    
        socket.emit('drawing', {
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color: contextRef.current.strokeStyle,
            recipient: recipientUsername 
        });
    };

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = getCoordinates(nativeEvent);
        setIsDrawing(true);
        setLastPos({ x: offsetX, y: offsetY });
    };

    const finishDrawing = () => {
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) {
            return;
        }
        const { offsetX, offsetY } = getCoordinates(nativeEvent);
        drawLine(lastPos.x, lastPos.y, offsetX, offsetY, true);
        setLastPos({ x: offsetX, y: offsetY });
    };

    const getCoordinates = (event) => {
        if (event.touches) {
            // Touch event
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            return {
                offsetX: (event.touches[0].clientX - rect.left) * 2, // Multiply by 2 due to the canvas scaling
                offsetY: (event.touches[0].clientY - rect.top) * 2
            };
        } else {
            // Mouse event
            return { offsetX: event.offsetX, offsetY: event.offsetY };
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('clear_canvas', {recipient: recipientUsername}); 
    };

    const handleRemoteDrawing = (data) => {
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, false);
    };

    useEffect(() => {
        socket.on('drawing', handleRemoteDrawing);
        socket.on('clear_canvas', () => {
            const canvas = canvasRef.current;
            contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        });
        return () => {
            socket.off('drawing', handleRemoteDrawing);
            socket.off('clear_canvas');
        };
    }, [socket, currentUsername]);

    return (
        <div className='whiteboard-page-container'>
            <div className='color-picker-container'>
                <input className='color' type="color" onChange={(e) => contextRef.current.strokeStyle = e.target.value} />
                <button className='clear-whiteboard' onClick={clearCanvas}>Clear</button>
            </div>
            <div className='whiteboard-container'>
                <div className='board-container'>
                    <canvas
                        onMouseDown={startDrawing}
                        onMouseUp={finishDrawing}
                        onMouseMove={draw}
                        onTouchStart={startDrawing}
                        onTouchEnd={finishDrawing}
                        onTouchMove={draw}
                        ref={canvasRef}
                        className='board'
                        id='board'
                    />
                </div>
            </div>
        </div>
    );
};

export default Whiteboard;
