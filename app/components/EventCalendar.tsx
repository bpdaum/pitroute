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
            events.map(e => {
                const mainDate = new Date(e.date);
                // BBQ Comps start Friday (setup) and end Saturday (turn in)
                const start = new Date(mainDate.getTime() - 24 * 60 * 60 * 1000);
                // react-big-calendar end date is exclusive. To cover Saturday, end on Sunday.
                const end = new Date(mainDate.getTime() + 24 * 60 * 60 * 1000);

                return {
                    id: e.id,
                    title: e.name,
                    start,
                    end,
                    resource: e,
                };
            }),
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
