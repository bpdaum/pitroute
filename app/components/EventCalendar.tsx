"use client";

import { useMemo } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { EventItem, getOrgColor } from "./EventCard";

const localizer = momentLocalizer(moment);

interface Props {
    events: EventItem[];
    onSelectEvent: (event: EventItem) => void;
}

export function EventCalendar({ events, onSelectEvent }: Props) {
    const calEvents = useMemo(
        () =>
            events.map(e => ({
                id: e.id,
                title: e.name,
                start: new Date(e.date),
                end: new Date(new Date(e.date).getTime() + 24 * 60 * 60 * 1000),
                resource: e,
            })),
        [events]
    );

    function eventStyleGetter(event: (typeof calEvents)[0]) {
        const color = getOrgColor(event.resource.organization.name);
        return {
            style: {
                backgroundColor: color,
                color: "#fff",
            },
        };
    }

    return (
        <div className="h-full p-4">
            <Calendar
                localizer={localizer}
                events={calEvents}
                defaultView={Views.MONTH}
                views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
                style={{ height: "100%" }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={ev => onSelectEvent(ev.resource)}
                popup
                tooltipAccessor={ev => `${ev.resource.organization.name}: ${ev.title}`}
            />
        </div>
    );
}
