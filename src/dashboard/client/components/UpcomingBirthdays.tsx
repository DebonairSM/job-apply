import React from 'react';
import { useUpcomingBirthdays, LeadWithBirthday } from '../hooks/useUpcomingBirthdays';
import { Icon } from './Icon';

export function UpcomingBirthdays() {
  const { data: leads, isLoading } = useUpcomingBirthdays(30);

  const formatBirthdayMessage = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today!';
    if (daysUntil === 1) return 'Tomorrow';
    return `in ${daysUntil} days`;
  };

  const getBirthdayColor = (daysUntil: number) => {
    if (daysUntil === 0) return { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-600' };
    if (daysUntil <= 7) return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <Icon icon="cake" size={24} className="text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h2>
              <p className="text-sm text-gray-600">Leads to reach out to</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Icon icon="progress-activity" size={28} className="text-pink-600 animate-spin" />
              <span className="text-gray-600">Loading birthdays...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <Icon icon="cake" size={24} className="text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h2>
              <p className="text-sm text-gray-600">Leads to reach out to</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Icon icon="event" size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming birthdays in the next 30 days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <Icon icon="cake" size={24} className="text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h2>
              <p className="text-sm text-gray-600">Leads to reach out to</p>
            </div>
          </div>
          <span className="text-sm text-gray-500">{leads.length} birthday{leads.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {leads.map((lead) => {
            const colors = getBirthdayColor(lead.daysUntilBirthday);
            return (
              <div
                key={lead.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-md transition-all`}
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0 border ${colors.border}`}>
                  <Icon icon="cake" size={28} className={colors.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{lead.name}</p>
                      {lead.title && (
                        <p className="text-sm text-gray-600 truncate">{lead.title}</p>
                      )}
                      {lead.company && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{lead.company}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-semibold ${colors.text}`}>
                        {formatBirthdayMessage(lead.daysUntilBirthday)}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <Icon icon="email" size={14} className="text-green-500" />
                          <span className="text-xs text-gray-500">Has email</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={lead.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs ${colors.text} hover:underline`}
                    >
                      <Icon icon="open-in-new" size={14} />
                      <span>View Profile</span>
                    </a>
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}?subject=Happy Birthday!`}
                        className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                      >
                        <Icon icon="email" size={14} />
                        <span>Send Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

