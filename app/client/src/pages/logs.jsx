import react, { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const Logs = ({ baseip }) => {
  const backend = baseip + ":5000";
  const { conferenceId } = useParams();
  const meetingId = conferenceId;
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  const getlogs = async () => {
    try {
      const logsData = await axios.get(`${backend}/conference/log`, {
        headers: {
          token: localStorage.getItem("token"),
          meetingid: meetingId,
        },
      });
      console.log(logsData.data);
      const Obtainedlogs = logsData.data.logs;
      setLogs(Obtainedlogs);
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getlogs();
  }, []);

  //now represent the logs in a table
  return (
    <div className="min-h-screen bg-blue-100 flex items-start justify-center p-4">
      <div className="mt-10 overflow-x-auto shadow-lg rounded-lg border border-blue-300 bg-white">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-blue-200 text-left text-sm font-semibold">
              <th className="px-6 py-3 border-b border-blue-300">Action</th>
              <th className="px-6 py-3 border-b border-blue-300">By</th>
              <th className="px-6 py-3 border-b border-blue-300">Time</th>
              <th className="px-6 py-3 border-b border-blue-300">Link</th>
            </tr>
          </thead>
          <tbody>
            {[...logs]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((log, index) => (
                <tr
                  key={index}
                  className={
                    index % 2 === 0
                      ? "bg-blue-100 hover:bg-blue-200"
                      : "hover:bg-blue-200"
                  }
                >
                  <td className="px-6 py-3 border-b border-blue-300">
                    {log.action}
                  </td>
                  <td className="px-6 py-3 border-b border-blue-300">
                    {log.by}
                  </td>
                  <td className="px-6 py-3 border-b border-blue-300">
                    {new Date(log.timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>
                  <td className="px-6 py-3 border-b border-blue-300">
                    <a
                      href={log.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {log.link}
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Logs;
